import { describe, expect, test, vi } from "vitest";
import type { CheckResult, CheckSummary } from "./live-check.ts";
import { ISSUE_TITLE, reportCheck } from "./report.ts";

const RUN_URL = "https://github.com/ryanyogan/yogan-hockey-2026/actions/runs/77";
const ISSUE_URL = "https://github.com/ryanyogan/yogan-hockey-2026/issues/90";

function result(endpoint: string, failure: Partial<CheckResult> = {}): CheckResult {
  return {
    endpoint,
    url: `https://espn.example/${endpoint}`,
    outcome: "ok",
    attempts: 1,
    status: null,
    message: "",
    issues: [],
    ...failure,
  };
}

const PASSED: CheckSummary = {
  ok: true,
  checkedAt: "2026-10-08T16:17:02.000Z",
  results: [result("scoreboard"), result("standings"), result("teams")],
  notChecked: [],
};

const FAILED: CheckSummary = {
  ok: false,
  checkedAt: "2026-10-07T16:17:02.000Z",
  results: [
    result("scoreboard"),
    result("standings", {
      outcome: "parse-failure",
      message: "ESPN standings did not parse: children.0.name: Invalid input",
      issues: ["children.0.name: Invalid input: expected string, received undefined"],
    }),
    result("teams", {
      outcome: "fetch-failure",
      attempts: 3,
      status: 503,
      message: "ESPN teams could not be fetched: HTTP 503",
    }),
  ],
  notChecked: ["the summary of a live game: none on today's slate"],
};

type Comment = { body: string };

/** A stand-in for the `gh` CLI over a tracker holding the issues given. */
function tracker(
  open: { number: number; title: string; url: string; comments?: Comment[] }[],
  labels: string[] = ["needs-triage", "ready-for-agent"],
) {
  const calls: { args: string[]; input: string | undefined }[] = [];
  const gh = vi.fn(async (args: string[], input?: string) => {
    calls.push({ args, input });
    const [noun, verb] = args;
    if (noun === "issue" && verb === "list") return JSON.stringify(open);
    if (noun === "issue" && verb === "view") {
      const issue = open.find((candidate) => String(candidate.number) === args[2]);
      return JSON.stringify({ comments: issue?.comments ?? [] });
    }
    if (noun === "label" && verb === "list")
      return JSON.stringify(labels.map((name) => ({ name })));
    if (noun === "label" && verb === "create") return "";
    if (noun === "issue" && verb === "create") return `${ISSUE_URL}\n`;
    if (noun === "issue" && verb === "comment") return `${ISSUE_URL}#issuecomment-1\n`;
    throw new Error(`unexpected gh ${args.join(" ")}`);
  });
  /** The calls that change the tracker. */
  const writes = () =>
    calls.filter(
      ({ args }) => args[0] === "issue" && (args[1] === "create" || args[1] === "comment"),
    );
  return { gh, calls, writes };
}

function report(summary: CheckSummary | null, gh: ReturnType<typeof tracker>["gh"]) {
  return reportCheck({ summary, gh, runUrl: RUN_URL });
}

const EXISTING = { number: 90, title: ISSUE_TITLE, url: ISSUE_URL };

describe("a failed check", () => {
  test("opens an issue labelled needs-triage naming each endpoint and its parse error", async () => {
    const { gh, writes } = tracker([{ number: 12, title: "Something else", url: "x" }]);

    const reported = await report(FAILED, gh);

    expect(reported).toEqual({ issue: "opened", issueUrl: ISSUE_URL });
    expect(writes()).toHaveLength(1);
    const [{ args, input }] = writes() as [{ args: string[]; input: string }];
    expect(args).toEqual([
      "issue",
      "create",
      "--title",
      "ESPN daily check is failing",
      "--label",
      "needs-triage",
      "--body-file",
      "-",
    ]);
    expect(input).toContain("failed on 2026-10-07");
    expect(input).toContain(RUN_URL);
    expect(input).toContain("`standings`");
    expect(input).toContain("children.0.name: Invalid input: expected string, received undefined");
    expect(input).toContain("`teams`");
    expect(input).toContain("ESPN teams could not be fetched: HTTP 503 (3 tries)");
    // The two kinds are told apart, the one this check exists for first.
    expect(input.indexOf("ESPN changed shape")).toBeGreaterThan(-1);
    expect(input.indexOf("ESPN changed shape")).toBeLessThan(input.indexOf("ESPN or the network"));
    expect(input).not.toContain("`scoreboard`");
    expect(input).toContain("pnpm check:espn");
  });

  test("makes the needs-triage label first when the tracker has none", async () => {
    const { gh, calls } = tracker([], ["ready-for-agent"]);

    await report(FAILED, gh);

    const made = calls.findIndex(({ args }) => args[0] === "label" && args[1] === "create");
    const opened = calls.findIndex(({ args }) => args[0] === "issue" && args[1] === "create");
    expect(calls[made]?.args.slice(0, 3)).toEqual(["label", "create", "needs-triage"]);
    expect(made).toBeLessThan(opened);
  });

  test("leaves a needs-triage label that exists as it is", async () => {
    const { gh, calls } = tracker([]);

    await report(FAILED, gh);

    expect(calls.some(({ args }) => args[0] === "label" && args[1] === "create")).toBe(false);
  });

  test("comments on the open issue instead of opening a second one", async () => {
    const { gh, writes } = tracker([EXISTING]);

    const reported = await report(FAILED, gh);

    expect(reported).toEqual({ issue: "commented", issueUrl: ISSUE_URL });
    expect(writes()).toHaveLength(1);
    const [{ args, input }] = writes() as [{ args: string[]; input: string }];
    expect(args).toEqual(["issue", "comment", "90", "--body-file", "-"]);
    expect(input).toContain("failed again on 2026-10-07");
    expect(input).toContain("`standings`");
  });

  test("a check that wrote no summary is reported as a failure too", async () => {
    const { gh, writes } = tracker([]);

    const reported = await report(null, gh);

    expect(reported.issue).toBe("opened");
    expect(writes()[0]?.input).toContain("did not finish");
  });

  test("fails when the issue cannot be filed, so the run is red", async () => {
    const gh = vi.fn(async () => {
      throw new Error("gh: HTTP 403");
    });

    await expect(report(FAILED, gh)).rejects.toThrow("gh: HTTP 403");
  });
});

describe("a check that passes", () => {
  test("does nothing when no issue is open", async () => {
    const { gh, writes } = tracker([]);

    const reported = await report(PASSED, gh);

    expect(reported).toEqual({ issue: "none", issueUrl: null });
    expect(writes()).toEqual([]);
  });

  test("comments that it cleared on the open issue, and leaves it open", async () => {
    const { gh, calls, writes } = tracker([EXISTING]);

    const reported = await report(PASSED, gh);

    expect(reported).toEqual({ issue: "cleared", issueUrl: ISSUE_URL });
    const [{ args, input }] = writes() as [{ args: string[]; input: string }];
    expect(args).toEqual(["issue", "comment", "90", "--body-file", "-"]);
    expect(input).toContain("passed on 2026-10-08");
    expect(input).toContain("3 endpoints");
    expect(calls.some(({ args }) => args[1] === "close")).toBe(false);
  });

  test("says what the passing run did not look at, since that may be what had failed", async () => {
    const { gh, writes } = tracker([EXISTING]);
    const gap = "the summary of a live game: none on today's slate";

    await report({ ...PASSED, notChecked: [gap] }, gh);

    expect(writes()[0]?.input).toContain(`Not checked by this run:\n\n- ${gap}`);
  });

  test("says it cleared once, not on every passing day the issue stays open", async () => {
    const first = tracker([EXISTING]);
    await report(PASSED, first.gh);
    const cleared = first.writes()[0]?.input ?? "";
    const { gh, writes } = tracker([{ ...EXISTING, comments: [{ body: cleared }] }]);

    const reported = await report(PASSED, gh);

    expect(reported).toEqual({ issue: "none", issueUrl: ISSUE_URL });
    expect(writes()).toEqual([]);
  });

  test("says it cleared again after a failure that followed a pass", async () => {
    const first = tracker([EXISTING]);
    await report(PASSED, first.gh);
    const cleared = first.writes()[0]?.input ?? "";
    const second = tracker([{ ...EXISTING, comments: [{ body: cleared }] }]);
    await report(FAILED, second.gh);
    const failedAgain = second.writes()[0]?.input ?? "";
    const { gh } = tracker([
      {
        ...EXISTING,
        comments: [{ body: cleared }, { body: "A person's note." }, { body: failedAgain }],
      },
    ]);

    const reported = await report(PASSED, gh);

    expect(reported.issue).toBe("cleared");
  });
});
