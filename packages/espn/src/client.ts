import type {
  GameSummary,
  PlayerCareer,
  PlayerGameLog,
  PlayerProfile,
  PlayerSearchResult,
  Scoreboard,
  Standings,
  Team,
  TeamDetail,
  TeamSchedule,
} from "@yogan-hockey/schemas";
import { type Endpoint, endpoints } from "./endpoints.ts";
import { EspnFetchError, EspnParseError } from "./errors.ts";
import {
  translatePlayer,
  translatePlayerCareer,
  translatePlayerGameLog,
  translatePlayerSearch,
} from "./player.ts";
import { translateScoreboard } from "./scoreboard.ts";
import { translateStandings } from "./standings.ts";
import { translateGameSummary } from "./summary.ts";
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

/**
 * One game as it is now: the header, every play so far, and what a Prediction is made from.
 * About 450 KB from ESPN for a finished game, so the Game Agent polls it and nothing caches it.
 */
export async function getGameSummary(gameId: string): Promise<GameSummary> {
  return translateGameSummary(await read(endpoints.summary(gameId)), gameId);
}

/** A player page's header and season summary. */
export async function getPlayer(playerId: string): Promise<PlayerProfile> {
  return translatePlayer(await read(endpoints.player(playerId)), playerId);
}

/**
 * ESPN has a profile for a player who has yet to play in the NHL, and answers 404 for his stats
 * and his game log. That is an empty table, not a missing player: the profile says who exists.
 */
async function readTable(endpoint: Endpoint): Promise<unknown> {
  try {
    return await read(endpoint);
  } catch (error) {
    if (error instanceof EspnFetchError && error.status === 404) return {};
    throw error;
  }
}

/** A player's career table: one row per regular season, with totals. Empty before his first game. */
export async function getPlayerCareer(playerId: string): Promise<PlayerCareer> {
  return translatePlayerCareer(await readTable(endpoints.playerCareer(playerId)), playerId);
}

/** A player's games in his latest season, newest first. Empty before his first game. */
export async function getPlayerGameLog(playerId: string): Promise<PlayerGameLog> {
  return translatePlayerGameLog(await readTable(endpoints.playerGameLog(playerId)), playerId);
}

/** Up to ten NHL players whose names match. A blank query finds nobody and asks ESPN nothing. */
export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const wanted = query.trim();
  if (wanted === "") return [];
  return translatePlayerSearch(await read(endpoints.playerSearch(wanted)), wanted);
}
