import type { GameHeader, GameSnapshot } from "@yogan-hockey/schemas";
import { readGame } from "./game";
import { isGameId } from "./game/page-state";

/** A game the page can draw: its snapshot from the Game Agent, with a header. */
export type FoundGame = GameSnapshot & { header: GameHeader };

/**
 * The game behind `/nhl/games/:id` for first paint, or null when there is no such game: the page
 * then answers "game not found". An id that cannot be ESPN's is answered without waking an Agent,
 * so a mistyped address never makes one. A game ESPN could not be asked about (no header, and not
 * "no such game") is an error, not a missing game.
 */
export async function findGame(id: string): Promise<FoundGame | null> {
  if (!isGameId(id)) return null;
  const snapshot = await readGame(id);
  if (snapshot.notFound) return null;
  if (snapshot.header == null) throw new Error(`Game ${id} could not be read from ESPN`);
  return { ...snapshot, header: snapshot.header };
}
