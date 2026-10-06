import type { Scoreboard, Standings, Team, TeamDetail, TeamSchedule } from "@yogan-hockey/schemas";
import { type Endpoint, endpoints } from "./endpoints.ts";
import { EspnFetchError, EspnParseError } from "./errors.ts";
import { translateScoreboard } from "./scoreboard.ts";
import { translateStandings } from "./standings.ts";
import { translateTeam, translateTeamSchedule, translateTeams } from "./team.ts";

const TIMEOUT_MS = 10_000;

async function fetchJson(endpoint: Endpoint): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(endpoint.url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new EspnFetchError(endpoint.name, null, "no response", { cause });
  }
  if (!response.ok) {
    throw new EspnFetchError(endpoint.name, response.status, `HTTP ${response.status}`);
  }
  let body: string;
  try {
    body = await response.text();
  } catch (cause) {
    throw new EspnFetchError(endpoint.name, response.status, "the response broke off", { cause });
  }
  try {
    return JSON.parse(body);
  } catch (cause) {
    if (cause instanceof SyntaxError) throw new EspnParseError(endpoint.name, cause);
    throw cause;
  }
}

/**
 * Fixture mode, switched on by `ESPN_FIXTURES=1`: every read is answered from the recorded
 * responses in `fixtures/` and nothing touches the network.
 */
async function read(endpoint: Endpoint): Promise<unknown> {
  // The test is written out here, not behind a function, so a build that compiles the variable
  // in as off (apps/web/vite.config.ts) drops this branch and the recorded responses with it.
  if (typeof process !== "undefined" && process.env.ESPN_FIXTURES === "1") {
    const { loadFixture } = await import("./fixtures.ts");
    return loadFixture(endpoint);
  }
  return fetchJson(endpoint);
}

/** ESPN's current slate of games, or the slate of one `YYYY-MM-DD` date. */
export async function getScoreboard(date?: string): Promise<Scoreboard> {
  return translateScoreboard(await read(endpoints.scoreboard(date)), date);
}

/** The league standings, one row per team. */
export async function getStandings(): Promise<Standings> {
  return translateStandings(await read(endpoints.standings()));
}

/** Every NHL team. */
export async function getTeams(): Promise<Team[]> {
  return translateTeams(await read(endpoints.teams()));
}

/** One team's page: the team, its record, stats, roster and next game. */
export async function getTeam(teamId: string): Promise<TeamDetail> {
  return translateTeam(await read(endpoints.team(teamId)), teamId);
}

/** One team's regular-season schedule for the current season. */
export async function getTeamSchedule(teamId: string): Promise<TeamSchedule> {
  return translateTeamSchedule(await read(endpoints.teamSchedule(teamId)), teamId);
}
