import { exports } from "cloudflare:workers";
import type { GameSnapshot } from "@yogan-hockey/schemas";
import { getAgentByName } from "agents";
import { gameConnection } from "./game-connection";

/**
 * One game for first paint, read from its Game Agent by a server component: the header, every
 * play so far, and `notFound` when ESPN has no such game. The Agent asks ESPN first when what it
 * has is old. The answer is copied to a plain object, so it can be passed to the client component
 * that then keeps it current with `useGameStream`.
 */
export async function readGame(gameId: string): Promise<GameSnapshot> {
  const game = await getAgentByName(exports.GameAgent, gameConnection(gameId).name);
  return structuredClone(await game.getGame());
}

/**
 * For the Replay's first open of a finished game whose plays are not in D1: has the game's Agent
 * read it from ESPN once, write it to D1 and set the 24-hour re-read. True when the game is in D1
 * as this returns.
 */
export async function archiveGame(gameId: string): Promise<boolean> {
  const game = await getAgentByName(exports.GameAgent, gameConnection(gameId).name);
  return game.ensureArchived();
}
