/**
 * What the daily live ESPN check does with its result: one issue in the tracker while the check
 * is failing. Kept apart from the workflow so it can be tested without a runner.
 *
 * - A failure with no issue open opens one, labelled `needs-triage`.
 * - A failure with the issue open comments on it: there is only ever one open issue. The check
 *   runs eight times a day, so it comments only when what fails is not what it last wrote.
 * - A pass with the issue open comments, once, that it cleared. The issue stays open for a person
 *   to close: a parse failure can depend on what is on that day (a live game's summary, say), so
 *   one pass does not prove the cause is gone.
 */
import { z } from "zod";
import { type CheckResult, type CheckSummary, triesNote } from "./live-check.ts";

/** The open issue with exactly this title is the check's. Rename it and the next failure opens another. */
export const ISSUE_TITLE = "ESPN daily check is failing";
export const LABEL = "needs-triage";

// Each thing the check writes carries one of these, so the next run can tell where things stand
// from the last one written, whatever people have said in between.
// A failure's mark also says what failed, which is how the next failing run knows whether it has
// anything new to say.
const FAILED_MARK = "<!-- espn-check: failed";
const CLEARED_MARK = "<!-- espn-check: cleared -->";

/** `<!-- espn-check: failed: parse teams/21, fetch standings -->` */
function failedMark(summary: CheckSummary | null): string {
  const failed =
    summary?.results
      .filter((result) => result.outcome !== "ok")
      .map((result) => `${result.outcome.replace("-failure", "")} ${result.endpoint}`)
      .join(", ") ?? "no summary";
  // An endpoint's name is ESPN's path and query, which a `>` would not survive in a URL anyway.
  return `${FAILED_MARK}: ${failed.replaceAll(">", "")} -->`;
}

/** Runs the `gh` CLI with these arguments, `input` on its stdin, and answers its stdout. */
export type Gh = (args: string[], input?: string) => Promise<string>;

export type ReportOptions = {
  /** The run's summary, or null when the check did not get as far as writing one. */
  summary: CheckSummary | null;
  gh: Gh;
  /** The workflow run, linked from the issue. */
  runUrl: string | undefined;
};

export type Reported = {
  /** `unchanged`: the issue is open and already says what this run found, so nothing was written. */
  issue: "opened" | "commented" | "unchanged" | "cleared" | "none";
  /** The check's open issue, if there is one after this run. */
  issueUrl: string | null;
};

type OpenIssue = { number: number; url: string };

// What `gh --json` answers, for the three questions asked of it.
const GhIssues = z.array(z.object({ number: z.number(), title: z.string(), url: z.string() }));
const GhLabels = z.array(z.object({ name: z.string() }));
const GhThread = z.object({
  body: z.string(),
  comments: z.array(z.object({ body: z.string() })),
});

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
  return GhIssues.parse(JSON.parse(listed)).find((issue) => issue.title === ISSUE_TITLE) ?? null;
}

/** `gh issue create` refuses a label the tracker does not have, so a missing one is made first. */
async function ensureLabel(gh: Gh): Promise<void> {
  const listed = await gh(["label", "list", "--limit", "1000", "--json", "name"]);
  const labels = GhLabels.parse(JSON.parse(listed));
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

/** The last thing the check wrote on its issue, the issue's own text included. */
async function lastWritten(gh: Gh, issue: OpenIssue): Promise<string> {
  const viewed = await gh(["issue", "view", String(issue.number), "--json", "body,comments"]);
  const { body, comments } = GhThread.parse(JSON.parse(viewed));
  const written = [body, ...comments.map((comment) => comment.body)];
  return (
    written.findLast((text) => text.includes(FAILED_MARK) || text.includes(CLEARED_MARK)) ?? ""
  );
}

const failuresOf = (summary: CheckSummary, outcome: CheckResult["outcome"]) =>
  summary.results.filter((result) => result.outcome === outcome);

function failureList(results: CheckResult[]): string[] {
  return results.flatMap((result) => {
    const detail =
      result.issues.length > 0 ? result.issues : [`${result.message}${triesNote(result)}`];
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
          "One that passes on a later run needs nothing done.",
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
  // The hour too: the check runs eight times a day.
  return summary
    ? ` on ${summary.checkedAt.slice(0, 10)} at ${summary.checkedAt.slice(11, 16)} UTC`
    : "";
}

function runLink(runUrl: string | undefined): string {
  return runUrl ? ` [The run](${runUrl}).` : "";
}

function issueBody(summary: CheckSummary | null, runUrl: string | undefined): string {
  return [
    failedMark(summary),
    `The live ESPN check failed${when(summary)}.${runLink(runUrl)}`,
    "",
    ...failureDetail(summary),
    "### What to do",
    "",
    'Run `pnpm check:espn` to see it now. A parse failure names the endpoint and the path in ESPN\'s response that the schema in `packages/espn/src` no longer matches: fix the schema and its translation, then `pnpm record:fixtures` and `pnpm test -u` so the fixtures show the new shape. `docs/agents/build-notes.md` has more under "The daily live ESPN check".',
    "",
    "A later failing run comments here when what fails has changed, and the first run that passes comments that it cleared. Nothing closes this issue but a person.",
  ].join("\n");
}

function failedAgainBody(summary: CheckSummary | null, runUrl: string | undefined): string {
  return [
    failedMark(summary),
    `The check failed again${when(summary)}.${runLink(runUrl)}`,
    "",
    ...failureDetail(summary),
  ].join("\n");
}

function clearedBody(summary: CheckSummary, runUrl: string | undefined): string {
  return [
    CLEARED_MARK,
    `The check passed${when(summary)}: all ${summary.results.length} endpoints it fetched parse.${runLink(runUrl)}`,
    "",
    // A failure in a live game's summary is not cleared by a run that had no live game to fetch.
    ...(summary.notChecked.length > 0
      ? ["Not checked by this run:", "", ...summary.notChecked.map((gap) => `- ${gap}`), ""]
      : []),
    "Left open for a person to close. A parse failure can depend on what is on that day, so one pass does not prove the cause is gone.",
  ].join("\n");
}

/** Files the run's result in the tracker. Throws if the tracker refuses. */
export async function reportCheck(options: ReportOptions): Promise<Reported> {
  const { summary, gh, runUrl } = options;
  const open = await findOpenIssue(gh);

  if (summary?.ok) {
    if (open === null) return { issue: "none", issueUrl: null };
    if ((await lastWritten(gh, open)).includes(CLEARED_MARK)) {
      return { issue: "none", issueUrl: open.url };
    }
    await gh(
      ["issue", "comment", String(open.number), "--body-file", "-"],
      clearedBody(summary, runUrl),
    );
    return { issue: "cleared", issueUrl: open.url };
  }

  if (open === null) {
    await ensureLabel(gh);
    const created = await gh(
      ["issue", "create", "--title", ISSUE_TITLE, "--label", LABEL, "--body-file", "-"],
      issueBody(summary, runUrl),
    );
    return { issue: "opened", issueUrl: created.trim() };
  }
  if ((await lastWritten(gh, open)).includes(failedMark(summary))) {
    return { issue: "unchanged", issueUrl: open.url };
  }
  await gh(
    ["issue", "comment", String(open.number), "--body-file", "-"],
    failedAgainBody(summary, runUrl),
  );
  return { issue: "commented", issueUrl: open.url };
}
