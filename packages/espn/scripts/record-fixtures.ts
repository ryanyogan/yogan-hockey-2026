/**
 * Refetches the recorded ESPN responses in `fixtures/`. Run by hand: `pnpm record:fixtures`.
 *
 * Responses are written exactly as ESPN sent them. The undated scoreboard is whatever slate is
 * on when this runs, so record it during an evening of games to capture scheduled, live and
 * final games together; then update the snapshots (`pnpm test -u`) and review the diff.
 */
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { type Endpoint, endpoints } from "../src/endpoints.ts";

/** Toronto: its page is the one the smoke tests visit, and its roster is where Rylan goes. */
const TEAM_ID = "21";

/** Auston Matthews, a skater, and Anthony Stolarz, a goalie: their stat tables have different columns. */
const PLAYER_IDS = ["4024123", "3067313"];

const RECORDED: Endpoint[] = [
  endpoints.scoreboard(),
  // A fixed slate of thirteen finished games, three of them decided in overtime.
  endpoints.scoreboard("2026-10-03"),
  endpoints.standings(),
  endpoints.teams(),
  endpoints.team(TEAM_ID),
  endpoints.teamSchedule(TEAM_ID),
  // A finished game decided in a shootout: its plays end 3-2 where the final is 4-3.
  endpoints.summary("401803652"),
  ...PLAYER_IDS.flatMap((id) => [
    endpoints.player(id),
    endpoints.playerCareer(id),
    endpoints.playerGameLog(id),
  ]),
  // Ten players, the most a search returns.
  endpoints.playerSearch("mar"),
];

/**
 * Recorded once and kept: a game is only scheduled until it is played, so recording it again
 * would replace the pre-game summary with a finished one. To record another, add it here.
 */
const RECORDED_ONCE: Endpoint[] = [
  // Nashville at Toronto, recorded five hours before the puck dropped on 2026-10-06.
  endpoints.summary("401892449"),
];

function fixtureFile(endpoint: Endpoint): URL {
  return new URL(`../fixtures/${endpoint.fixture}.json`, import.meta.url);
}

const kept = RECORDED_ONCE.filter((endpoint) => existsSync(fixtureFile(endpoint)));
for (const endpoint of kept) console.log(`kept ${endpoint.name} (recorded once)`);

let failed = false;
for (const endpoint of [...RECORDED, ...RECORDED_ONCE.filter((e) => !kept.includes(e))]) {
  const response = await fetch(endpoint.url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    console.error(`FAILED ${endpoint.name}: HTTP ${response.status}`);
    failed = true;
    continue;
  }
  const body = await response.text();
  JSON.parse(body); // a recording that is not JSON is not worth keeping
  await writeFile(fixtureFile(endpoint), body);
  console.log(
    `recorded ${endpoint.name} -> fixtures/${endpoint.fixture}.json (${body.length} bytes)`,
  );
}
if (failed) process.exitCode = 1;
