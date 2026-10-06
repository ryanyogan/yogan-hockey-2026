import type { GameHeader, GameSnapshot } from "@yogan-hockey/schemas";
import { readGame } from "./game";
import { isGameId } from "./game/page-state";

/** A game the page can draw: its snapshot from the Game Agent, with a header. */
export type FoundGame = GameSnapshot & { header: GameHeader };

/**
 * What `/nhl/games/:id` has to go on at first paint: the game; `missing`, which is the "game not
 * found" page; or `unreadable`, a game that may well exist and could not be read just now, which
 * the page says in words instead of failing.
 */
export type GameLookup =
  | { state: "found"; game: FoundGame }
  | { state: "missing" }
  | { state: "unreadable" };

/**
 * The game behind `/nhl/games/:id` for first paint. An id that cannot be ESPN's is answered
 * without waking an Agent, so a mistyped address never makes one.
 *
 * The Game Agent answers only once it has asked ESPN, so a snapshot with no header and no "not
 * found" means ESPN did not answer for a game the Agent has never seen: `unreadable`, and the
 * Agent asks again on the next visit. A read that throws (the Agent itself could not be reached)
 * is made once more; a second throw is `unreadable` too.
 */
export async function findGame(
  id: string,
  read: (gameId: string) => Promise<GameSnapshot> = readGame,
): Promise<GameLookup> {
  if (!isGameId(id)) return { state: "missing" };
  for (const attempt of [1, 2]) {
    try {
      const snapshot = await read(id);
      if (snapshot.notFound) return { state: "missing" };
      if (snapshot.header != null) {
        return { state: "found", game: { ...snapshot, header: snapshot.header } };
      }
      console.error(`Game ${id}: ESPN did not answer, so there is no header to draw`);
      return { state: "unreadable" };
    } catch (error) {
      console.error(`Game ${id}: read ${attempt} failed`, error);
    }
  }
  return { state: "unreadable" };
}
