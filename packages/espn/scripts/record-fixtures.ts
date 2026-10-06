/**
 * Refetches the recorded ESPN responses in `fixtures/`. Run by hand: `pnpm record:fixtures`.
 *
 * Responses are written exactly as ESPN sent them. The undated scoreboard is whatever slate is
 * on when this runs, so record it during an evening of games to capture scheduled, live and
 * final games together; then update the snapshots (`pnpm test -u`) and review the diff.
 */
import { writeFile } from "node:fs/promises";
import { type Endpoint, endpoints } from "../src/endpoints.ts";

/** Toronto: its page is the one the smoke tests visit, and its roster is where Rylan goes. */
const TEAM_ID = "21";

const RECORDED: Endpoint[] = [
  endpoints.scoreboard(),
  // A fixed slate of thirteen finished games, three of them decided in overtime.
  endpoints.scoreboard("2026-10-03"),
  endpoints.standings(),
  endpoints.teams(),
  endpoints.team(TEAM_ID),
  endpoints.teamSchedule(TEAM_ID),
];

let failed = false;
for (const endpoint of RECORDED) {
  const response = await fetch(endpoint.url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    console.error(`FAILED ${endpoint.name}: HTTP ${response.status}`);
    failed = true;
    continue;
  }
  const body = await response.text();
  JSON.parse(body); // a recording that is not JSON is not worth keeping
  const file = new URL(`../fixtures/${endpoint.fixture}.json`, import.meta.url);
  await writeFile(file, body);
  console.log(
    `recorded ${endpoint.name} -> fixtures/${endpoint.fixture}.json (${body.length} bytes)`,
  );
}
if (failed) process.exitCode = 1;
