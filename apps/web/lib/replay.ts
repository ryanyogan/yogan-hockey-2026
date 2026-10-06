import { env } from "cloudflare:workers";
import { createDb, getGameWithPlays } from "@yogan-hockey/db";
import type { Play } from "@yogan-hockey/schemas";
import type { FoundGame } from "./find-game";
import { archiveGame } from "./game";
import { gamePhase } from "./game/page-state";

/**
 * A finished game's plays for its Replay, from D1 and nowhere else. When they are not there
 * (nobody watched the game live) this open archives them first: the Game Agent reads ESPN once,
 * writes the game and its plays and sets the 24-hour re-read (`archiveGame`), and the plays are
 * then read back from D1. Every later open is the one D1 read.
 *
 * Null when there is nothing to replay yet: the game is not over, ESPN has no plays for it, it is
 * waiting on its last poll, or the write failed. Asking again later is how that is retried.
 */
export async function replayPlays(
  gameId: string,
  archive: (gameId: string) => Promise<boolean> = archiveGame,
): Promise<Play[] | null> {
  const db = createDb(env.DB);
  const kept = await getGameWithPlays(db, gameId);
  if (kept != null && kept.plays.length > 0) return kept.plays;
  if (!(await archive(gameId))) return null;
  const archived = await getGameWithPlays(db, gameId);
  return archived != null && archived.plays.length > 0 ? archived.plays : null;
}

/**
 * The game a page draws, made ready for the Replay when it is over. A snapshot the Game Agent
 * calls archived already carries D1's plays (the Agent keeps none of its own once they are
 * written), so it is left alone. One that is final and not archived gets `replayPlays`. When
 * that has nothing yet, or fails, the game comes back as it was read, not archived, and the page
 * asks again.
 */
export async function replayGame(
  game: FoundGame,
  archive?: (gameId: string) => Promise<boolean>,
): Promise<FoundGame> {
  if (gamePhase(game.header.status) !== "finished" || game.archived) return game;
  try {
    const plays = await replayPlays(game.header.id, archive);
    return plays == null ? game : { ...game, plays, archived: true };
  } catch (error) {
    // D1 or the Agent failing is no reason to lose the page: it has the game, and asks again.
    console.error(`Game ${game.header.id}: the replay could not be made ready`, error);
    return game;
  }
}
