import {
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
  Standings,
  Team,
  TeamDetail,
  TeamSchedule,
} from "@yogan-hockey/schemas";
import { unstable_cache } from "next/cache";

/**
 * ESPN reads through vinext's data cache on KV, each with the tag and time limit from the spec's
 * table. Pages read ESPN through these. The Agents call `@yogan-hockey/espn` directly, since they
 * want the answer as it is now, and invalidate these tags when a game goes final.
 *
 * The scoreboard is not here: live scores come from the Scoreboard Agent, never from this cache.
 * Nor is the game summary: the Game Agent and the Replay read it as it is now.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export const STANDINGS_TAG = "standings";
export const TEAMS_TAG = "teams";

/** The tag on everything cached about one team: its page and its schedule. */
export function teamTag(teamId: string): string {
  return `team:${teamId}`;
}

/** The tag on everything cached about one player: his page, career table and game log. */
export function playerTag(playerId: string): string {
  return `player:${playerId}`;
}

/** The league standings. Five minutes. */
export const cachedStandings: () => Promise<Standings> = unstable_cache(
  getStandings,
  ["espn-standings"],
  { tags: [STANDINGS_TAG], revalidate: 5 * MINUTE },
);

/** Every NHL team. Twenty-four hours. */
export const cachedTeams: () => Promise<Team[]> = unstable_cache(getTeams, ["espn-teams"], {
  tags: [TEAMS_TAG],
  revalidate: 24 * HOUR,
});

/** A team's page: record, roster and team stats. One hour. */
export function cachedTeam(teamId: string): Promise<TeamDetail> {
  return unstable_cache(() => getTeam(teamId), ["espn-team", teamId], {
    tags: [teamTag(teamId)],
    revalidate: HOUR,
  })();
}

/** A team's schedule. One hour. */
export function cachedTeamSchedule(teamId: string): Promise<TeamSchedule> {
  return unstable_cache(() => getTeamSchedule(teamId), ["espn-team-schedule", teamId], {
    tags: [teamTag(teamId)],
    revalidate: HOUR,
  })();
}

/** A player's page: who he is and his season summary. Six hours. */
export function cachedPlayer(playerId: string): Promise<PlayerProfile> {
  return unstable_cache(() => getPlayer(playerId), ["espn-player", playerId], {
    tags: [playerTag(playerId)],
    revalidate: 6 * HOUR,
  })();
}

/** A player's career table. Six hours. */
export function cachedPlayerCareer(playerId: string): Promise<PlayerCareer> {
  return unstable_cache(() => getPlayerCareer(playerId), ["espn-player-career", playerId], {
    tags: [playerTag(playerId)],
    revalidate: 6 * HOUR,
  })();
}

/** A player's games in his latest season. Six hours. */
export function cachedPlayerGameLog(playerId: string): Promise<PlayerGameLog> {
  return unstable_cache(() => getPlayerGameLog(playerId), ["espn-player-game-log", playerId], {
    tags: [playerTag(playerId)],
    revalidate: 6 * HOUR,
  })();
}

/** A player search. Ten minutes, under no tag. "Mar" and " mar " are one search. */
export function cachedPlayerSearch(query: string): Promise<PlayerSearchResult[]> {
  const wanted = query.trim().toLowerCase();
  return unstable_cache(() => searchPlayers(wanted), ["espn-player-search", wanted], {
    revalidate: 10 * MINUTE,
  })();
}
