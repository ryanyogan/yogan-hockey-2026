import { exports } from "cloudflare:workers";
import type { ScoreboardReading } from "@yogan-hockey/schemas";
import { getAgentByName } from "agents";
import { SCOREBOARD_CONNECTION } from "./scoreboard-connection";

/**
 * Today's games for first paint, and when ESPN was last heard from, read from the Scoreboard Agent
 * by a server component. The Agent asks ESPN first when what it has is old. The answer is copied
 * to a plain object, so it can be passed to the client component that then keeps it current with
 * `useAgent`.
 */
export async function readScoreboard(): Promise<ScoreboardReading> {
  const scoreboard = await getAgentByName(exports.ScoreboardAgent, SCOREBOARD_CONNECTION.name);
  return structuredClone(await scoreboard.getScoreboard());
}
