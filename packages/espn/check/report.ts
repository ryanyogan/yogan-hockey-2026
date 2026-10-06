/**
 * What the daily live ESPN check does with its result: one issue in the tracker while the check
 * is failing, and an ntfy push. Kept apart from the workflow so it can be tested without a runner.
 *
 * - A failure with no issue open opens one, labelled `needs-triage`.
 * - A failure with the issue open comments on it: there is only ever one open issue.
 * - A pass with the issue open comments, once, that it cleared. The issue stays open for a person
 *   to close: a parse failure can depend on what is on that day (a live game's summary, say), so
 *   one pass does not prove the cause is gone.
 * - A push goes out with each failure and with the comment that it cleared.
 */
import type { CheckResult, CheckSummary } from "./live-check.ts";

/** The open issue with exactly this title is the check's. Rename it and the next failure opens another. */
export const ISSUE_TITLE = "ESPN daily check is failing";
const LABEL = "needs-triage";
const NTFY = "https://ntfy.sh";

// Each thing the check writes carries one of these, so the next run can tell where things stand
// from the last one written, whatever people have said in between.
const FAILED_MARK = "<!-- espn-check: failed -->";
const CLEARED_MARK = "<!-- espn-check: cleared -->";

/** Runs the `gh` CLI with these arguments, `input` on its stdin, and answers its stdout. */
export type Gh = (args: string[], input?: string) => Promise<string>;

export type ReportOptions = {
  /** The run's summary, or null when the check did not get as far as writing one. */
  summary: CheckSummary | null;
  gh: Gh;
  fetch?: typeof fetch;
  /** The ntfy topic, an Actions secret. With none, no push is sent and a notice says so. */
  ntfyTopic: string | undefined;
  /** The workflow run, linked from the issue. */
  runUrl: string | undefined;
  /** Where notices go: stdout, which is where Actions reads `::notice::` from. */
  log?: (line: string) => void;
};

export type Reported = {
  issue: "opened" | "commented" | "cleared" | "none";
  /** The check's open issue, if there is one after this run. */
  issueUrl: string | null;
  push: "sent" | "skipped" | "failed" | "none";
};

type OpenIssue = { number: number; url: string };

async function findOpenIssue(gh: Gh): Promise<OpenIssue | null> {
  // Listed, not searched: GitHub's search lags behind an issue just opened.
  const listed = await gh([
    "issue",
    "list",
    "--state",
    "open",
    "--limit",
    "1000",
    "--json",
    "number,title,url",
  ]);
  const issues = JSON.parse(listed) as { number: number; title: string; url: string }[];
  return issues.find((issue) => issue.title === ISSUE_TITLE) ?? null;
}

/** `gh issue create` refuses a label the tracker does not have, so a missing one is made first. */
async function ensureLabel(gh: Gh): Promise<void> {
  const listed = await gh(["label", "list", "--limit", "1000", "--json", "name"]);
  const labels = JSON.parse(listed) as { name: string }[];
  if (labels.some((label) => label.name === LABEL)) return;
  await gh([
    "label",
    "create",
    LABEL,
    "--description",
    "Maintainer needs to evaluate this issue",
    "--color",
    "FBCA04",
  ]);
}

/** Whether the last thing the check wrote on its issue was that it had cleared. */
async function alreadyCleared(gh: Gh, issue: OpenIssue): Promise<boolean> {
  const viewed = await gh(["issue", "view", String(issue.number), "--json", "comments"]);
  const { comments } = JSON.parse(viewed) as { comments: { body: string }[] };
  const last = comments.findLast(
    ({ body }) => body.includes(FAILED_MARK) || body.includes(CLEARED_MARK),
  );
  return last?.body.includes(CLEARED_MARK) ?? false;
}

const failuresOf = (summary: CheckSummary, outcome: CheckResult["outcome"]) =>
  summary.results.filter((result) => result.outcome === outcome);

function failureList(results: CheckResult[]): string[] {
  return results.flatMap((result) => {
    const tries = result.attempts > 1 ? ` (${result.attempts} tries)` : "";
    const detail = result.issues.length > 0 ? result.issues : [`${result.message}${tries}`];
    return [`**\`${result.endpoint}\`** <${result.url}>`, "", "```", ...detail, "```", ""];
  });
}

function failureDetail(summary: CheckSummary | null): string[] {
  if (summary === null) {
    return ["The check did not finish and wrote no summary. The run's log says why.", ""];
  }
  const parse = failuresOf(summary, "parse-failure");
  const fetched = failuresOf(summary, "fetch-failure");
  return [
    ...(parse.length > 0
      ? ["### Parse failures: ESPN changed shape", "", ...failureList(parse)]
      : []),
    ...(fetched.length > 0
      ? [
          "### Fetch failures: ESPN or the network was down",
          "",
          "Each was tried three times. One that passes tomorrow needs nothing done.",
          "",
          ...failureList(fetched),
        ]
      : []),
    ...(summary.notChecked.length > 0
      ? ["Not checked:", "", ...summary.notChecked.map((gap) => `- ${gap}`), ""]
      : []),
  ];
}

function when(summary: CheckSummary | null): string {
  return summary ? ` on ${summary.checkedAt.slice(0, 10)}` : "";
}

function runLink(runUrl: string | undefined): string {
  return runUrl ? ` [The run](${runUrl}).` : "";
}

function issueBody(summary: CheckSummary | null, runUrl: string | undefined): string {
  return [
    FAILED_MARK,
    `The daily live ESPN check failed${when(summary)}.${runLink(runUrl)}`,
    "",
    ...failureDetail(summary),
    "### What to do",
    "",
    'Run `pnpm check:espn` to see it now. A parse failure names the endpoint and the path in ESPN\'s response that the schema in `packages/espn/src` no longer matches: fix the schema and its translation, then `pnpm record:fixtures` and `pnpm test -u` so the fixtures show the new shape. `docs/agents/build-notes.md` has more under "The daily live ESPN check".',
    "",
    "Each later failing run comments here, and the first run that passes comments that it cleared. Nothing closes this issue but a person.",
  ].join("\n");
}

function failedAgainBody(summary: CheckSummary | null, runUrl: string | undefined): string {
  return [
    FAILED_MARK,
    `The check failed again${when(summary)}.${runLink(runUrl)}`,
    "",
    ...failureDetail(summary),
  ].join("\n");
}

function clearedBody(summary: CheckSummary, runUrl: string | undefined): string {
  return [
    CLEARED_MARK,
    `The check passed${when(summary)}: all ${summary.results.length} endpoints parse.${runLink(runUrl)}`,
    "",
    "Left open for a person to close. A parse failure can depend on what is on that day, so one pass does not prove the cause is gone.",
  ].join("\n");
}

function failurePush(summary: CheckSummary | null): string {
  if (summary === null) return "The check did not finish. See the run's log.";
  const names = (outcome: CheckResult["outcome"]) =>
    failuresOf(summary, outcome)
      .map((result) => result.endpoint)
      .join(", ");
  const parse = names("parse-failure");
  const fetched = names("fetch-failure");
  return [parse && `Changed shape: ${parse}.`, fetched && `Could not be fetched: ${fetched}.`]
    .filter(Boolean)
    .join(" ");
}

type Push = { title: string; tag: "warning" | "white_check_mark"; message: string };

/** A push that cannot be delivered is a warning on the run: the issue is the record. */
async function push(
  { title, tag, message }: Push,
  click: string | undefined,
  options: Required<Pick<ReportOptions, "fetch" | "log">> & Pick<ReportOptions, "ntfyTopic">,
): Promise<Reported["push"]> {
  if (!options.ntfyTopic) {
    options.log(
      "::notice title=ntfy push skipped::The NTFY_TOPIC secret is not set, so no push was sent. scripts/account-setup.sh sets it.",
    );
    return "skipped";
  }
  try {
    const response = await options.fetch(`${NTFY}/${options.ntfyTopic}`, {
      method: "POST",
      headers: { Title: title, Tags: tag, ...(click ? { Click: click } : {}) },
      body: message,
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return "sent";
    options.log(`::warning title=ntfy push failed::ntfy answered HTTP ${response.status}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    options.log(`::warning title=ntfy push failed::${reason}`);
  }
  return "failed";
}

/** Files the run's result in the tracker and sends the push. Throws if the tracker refuses. */
export async function reportCheck(options: ReportOptions): Promise<Reported> {
  const { summary, gh, runUrl } = options;
  const sender = {
    fetch: options.fetch ?? fetch,
    log: options.log ?? console.log,
    ntfyTopic: options.ntfyTopic,
  };

  if (summary?.ok) {
    const open = await findOpenIssue(gh);
    if (open === null) return { issue: "none", issueUrl: null, push: "none" };
    if (await alreadyCleared(gh, open)) return { issue: "none", issueUrl: open.url, push: "none" };
    await gh(
      ["issue", "comment", String(open.number), "--body-file", "-"],
      clearedBody(summary, runUrl),
    );
    const cleared: Push = {
      title: "ESPN daily check recovered",
      tag: "white_check_mark",
      message: `All ${summary.results.length} endpoints parse again.`,
    };
    return { issue: "cleared", issueUrl: open.url, push: await push(cleared, open.url, sender) };
  }

  const failed: Push = {
    title: "ESPN daily check failed",
    tag: "warning",
    message: failurePush(summary),
  };
  let filed: Pick<Reported, "issue" | "issueUrl">;
  try {
    const open = await findOpenIssue(gh);
    if (open === null) {
      await ensureLabel(gh);
      const created = await gh(
        ["issue", "create", "--title", ISSUE_TITLE, "--label", LABEL, "--body-file", "-"],
        issueBody(summary, runUrl),
      );
      filed = { issue: "opened", issueUrl: created.trim() };
    } else {
      await gh(
        ["issue", "comment", String(open.number), "--body-file", "-"],
        failedAgainBody(summary, runUrl),
      );
      filed = { issue: "commented", issueUrl: open.url };
    }
  } catch (error) {
    // The push is the one thing left that can say the check failed, so it goes before the throw.
    await push(failed, runUrl, sender);
    throw error;
  }
  return { ...filed, push: await push(failed, filed.issueUrl ?? runUrl, sender) };
}
