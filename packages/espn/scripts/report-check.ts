/**
 * Files the result of `pnpm check:espn` in the tracker and sends the ntfy push. Run by
 * `.github/workflows/espn-check.yml` after the check, whether it passed or failed:
 * `node packages/espn/scripts/report-check.ts [--summary <file>] [--dry-run]`.
 *
 * Reads `NTFY_TOPIC`, and the run's address from the variables Actions sets. `gh` needs
 * `GH_TOKEN` with `issues: write`. With `--dry-run` nothing is written and nothing is sent: the
 * `gh` commands and the push are printed, as if no issue were open.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { type CheckSummary, CheckSummarySchema } from "../check/live-check.ts";
import { type Gh, LABEL, reportCheck } from "../check/report.ts";

const { values } = parseArgs({
  options: { summary: { type: "string" }, "dry-run": { type: "boolean" } },
});
const file = values.summary ?? "espn-check.json";

/** Null when the check wrote nothing, or nothing readable, which is itself reported as a failure. */
function readSummary(): CheckSummary | null {
  if (!existsSync(file)) return null;
  try {
    return CheckSummarySchema.parse(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    console.log(`::warning title=ESPN check summary unreadable::${file}: ${String(error)}`);
    return null;
  }
}

const gh: Gh = async (args, input) =>
  execFileSync("gh", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });

const printedGh: Gh = async (args, input) => {
  console.log(`[dry run] gh ${args.join(" ")}`);
  if (input !== undefined) console.log(input.replace(/^/gm, "    | "));
  if (args[0] === "label") return JSON.stringify([{ name: LABEL }]);
  if (args[1] === "list") return "[]";
  return args[1] === "create" ? "https://github.com/OWNER/REPO/issues/0" : "";
};

const printedFetch: typeof fetch = async (_url, init) => {
  console.log(`[dry run] ntfy push ${JSON.stringify(init?.headers)}: ${String(init?.body)}`);
  return new Response("{}");
};

const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
const runUrl =
  GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : undefined;

const reported = await reportCheck({
  summary: readSummary(),
  gh: values["dry-run"] ? printedGh : gh,
  fetch: values["dry-run"] ? printedFetch : fetch,
  ntfyTopic: process.env.NTFY_TOPIC,
  runUrl,
});
console.log(
  `issue: ${reported.issue}${reported.issueUrl ? ` (${reported.issueUrl})` : ""}; push: ${reported.push}`,
);
