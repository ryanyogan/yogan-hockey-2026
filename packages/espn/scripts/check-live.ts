/**
 * The daily live ESPN check, run by hand or by `.github/workflows/espn-check.yml`:
 * `pnpm check:espn [--summary <file>]`.
 *
 * Fetches every endpoint the site reads from live ESPN and runs the site's translation on each.
 * Prints a line per endpoint, writes the run as JSON (`espn-check.json` unless `--summary` names
 * another file) and exits 1 if any endpoint failed. It talks to the network, so it is no part of
 * `pnpm test`.
 */
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { describeCheck, runLiveCheck } from "../check/live-check.ts";

const { values } = parseArgs({ options: { summary: { type: "string" } } });

const summary = await runLiveCheck();
await writeFile(values.summary ?? "espn-check.json", `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(describeCheck(summary));
if (!summary.ok) process.exitCode = 1;
