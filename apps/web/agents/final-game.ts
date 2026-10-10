import { type Db, gameHasPlays, replaceGamePlays, saveFinalGame } from "@yogan-hockey/db";
import { getGameSummary, getTeam } from "@yogan-hockey/espn";
import { FinalGameSchema, type Game } from "@yogan-hockey/schemas";
import { gameTag, playerTag, STANDINGS_TAG, teamTag } from "../lib/espn";
import { invalidateTag, invalidateTags } from "../lib/invalidate-tag";

/**
 * What the site does about a finished game (spec section 4), apart from who decides when: the
 * Scoreboard Agent calls these at a final, on its two timers and in catch-up, and the Game Agent
 * (#48) has the same row to write and the same plays to re-read. Each is safe to repeat.
 */

/** Writes a finished game's row to D1: teams, date and final score. Writing it again replaces it. */
export async function saveFinal(db: Db, game: Game): Promise<void> {
  await saveFinalGame(db, FinalGameSchema.parse(game));
}

/** Both teams of a game, by ESPN's id. */
export function teamIdsOf(game: Game): string[] {
  return [game.home.id, game.away.id];
}

/**
 * Invalidates what a result changes for everyone: the standings and the teams that played. This
 * is all of a catch-up's invalidation and all of the second one, five minutes after a final.
 */
export async function invalidateStandingsAndTeams(teamIds: Iterable<string>): Promise<void> {
  const tags = [STANDINGS_TAG, ...[...new Set(teamIds)].map(teamTag)];
  // One call: the tags' page-cache times are one KV document, written once.
  await invalidateTags(tags);
}

/**
 * Invalidates everything a final makes stale: standings, both teams, the game, and every player
 * on both rosters. The rosters are asked of ESPN as they are now, one request a team; the tags a
 * roster is not needed for are invalidated first, so they are done even when ESPN fails.
 */
export async function invalidateForFinal(game: Game): Promise<void> {
  const teamIds = teamIdsOf(game);
  await Promise.all([invalidateStandingsAndTeams(teamIds), invalidateTag(gameTag(game.id))]);
  const teams = await Promise.all(teamIds.map(getTeam));
  const playerIds = new Set(teams.flatMap((team) => team.roster.map((player) => player.id)));
  await Promise.all([...playerIds].map((id) => invalidateTag(playerTag(id))));
}

/**
 * Reads a finished game's plays from ESPN into D1 again, if they were archived: ESPN corrects
 * plays for a day or so after the horn. A game whose plays were never archived is left alone,
 * since its Replay archives them when it is first opened. True when the plays were re-read.
 */
export async function rereadArchivedPlays(db: Db, gameId: string): Promise<boolean> {
  if (!(await gameHasPlays(db, gameId))) return false;
  const { plays } = await getGameSummary(gameId);
  await replaceGamePlays(db, gameId, plays);
  return true;
}
