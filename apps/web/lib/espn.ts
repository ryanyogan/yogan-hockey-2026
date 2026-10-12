import {
  getGameSummary,
  getPlayer,
  getPlayerCareer,
  getPlayerGameLog,
  getStandings,
  getTeam,
  getTeamSchedule,
  getTeams,
  searchPlayers,
} from "@yogan-hockey/espn";
import type {
  PlayerCareer,
  PlayerGameLog,
  PlayerProfile,
  PlayerSearchResult,
  Pregame,
  Standings,
  Team,
  TeamDetail,
  TeamSchedule,
} from "@yogan-hockey/schemas";
import { cached, forget } from "./kv-cache";

/**
 * ESPN reads through the site's cache on KV (`lib/kv-cache.ts`), each with the time limit from
 * the spec's table. Pages read ESPN through these. The Agents call `@yogan-hockey/espn` directly,
 * since they want the answer as it is now, and forget what a final changed (`forgetTeams`,
 * `forgetPlayers` and the rest, below).
 *
 * The scoreboard is not here: live scores come from the Scoreboard Agent, never from this cache.
 * Nor is the game summary: the Game Agent and the Replay read it as it is now. Only its pregame
 * facts, for a scheduled game's page, are cached.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;

const STANDINGS_KEY = "espn-standings";
const TEAM_LIST_KEY = "espn-teams";
const teamKey = (teamId: string) => `espn-team:${teamId}`;
const teamScheduleKey = (teamId: string) => `espn-team-schedule:${teamId}`;
const playerKey = (playerId: string) => `espn-player:${playerId}`;
const playerCareerKey = (playerId: string) => `espn-player-career:${playerId}`;
const playerGameLogKey = (playerId: string) => `espn-player-game-log:${playerId}`;
const gamePregameKey = (gameId: string) => `espn-game-pregame:${gameId}`;
const playerSearchKey = (wanted: string) => `espn-player-search:${wanted}`;

/** The next read of the standings is a fresh one. */
export function forgetStandings(): Promise<void> {
  return forget([STANDINGS_KEY]);
}

/** The next read of the team list is a fresh one. */
export function forgetTeamList(): Promise<void> {
  return forget([TEAM_LIST_KEY]);
}

/** The next read of each team's page and schedule is a fresh one. */
export function forgetTeams(teamIds: Iterable<string>): Promise<void> {
  return forget([...teamIds].flatMap((id) => [teamKey(id), teamScheduleKey(id)]));
}

/** The next read of each player's page, career table and game log is a fresh one. */
export function forgetPlayers(playerIds: Iterable<string>): Promise<void> {
  return forget(
    [...playerIds].flatMap((id) => [playerKey(id), playerCareerKey(id), playerGameLogKey(id)]),
  );
}

/** The next read of a game's pregame facts is a fresh one. */
export function forgetGame(gameId: string): Promise<void> {
  return forget([gamePregameKey(gameId)]);
}

/**
 * What a scheduled game's page shows of the matchup: records, standings, last five, goalies,
 * injuries, leaders and the season series. Fifteen minutes: none of it moves faster before a
 * game, and the header and plays, which do move, come from the Game Agent instead.
 */
export function cachedGamePregame(gameId: string): Promise<Pregame> {
  return cached(
    gamePregameKey(gameId),
    15 * MINUTE,
    async () => (await getGameSummary(gameId)).pregame,
  );
}

/** The league standings. Five minutes. */
export function cachedStandings(): Promise<Standings> {
  return cached(STANDINGS_KEY, 5 * MINUTE, getStandings);
}

/** Every NHL team. Twenty-four hours. */
export function cachedTeams(): Promise<Team[]> {
  return cached(TEAM_LIST_KEY, 24 * HOUR, getTeams);
}

/** A team's page: record, roster and team stats. One hour. */
export function cachedTeam(teamId: string): Promise<TeamDetail> {
  return cached(teamKey(teamId), HOUR, () => getTeam(teamId));
}

/** A team's schedule. One hour. */
export function cachedTeamSchedule(teamId: string): Promise<TeamSchedule> {
  return cached(teamScheduleKey(teamId), HOUR, () => getTeamSchedule(teamId));
}

/** A player's page: who he is and his season summary. Six hours. */
export function cachedPlayer(playerId: string): Promise<PlayerProfile> {
  return cached(playerKey(playerId), 6 * HOUR, () => getPlayer(playerId));
}

/** A player's career table. Six hours. */
export function cachedPlayerCareer(playerId: string): Promise<PlayerCareer> {
  return cached(playerCareerKey(playerId), 6 * HOUR, () => getPlayerCareer(playerId));
}

/** A player's games in his latest season. Six hours. */
export function cachedPlayerGameLog(playerId: string): Promise<PlayerGameLog> {
  return cached(playerGameLogKey(playerId), 6 * HOUR, () => getPlayerGameLog(playerId));
}

/** A player search. Ten minutes, and never forgotten. "Mar" and " mar " are one search. */
export function cachedPlayerSearch(query: string): Promise<PlayerSearchResult[]> {
  const wanted = query.trim().toLowerCase();
  return cached(playerSearchKey(wanted), 10 * MINUTE, () => searchPlayers(wanted));
}
