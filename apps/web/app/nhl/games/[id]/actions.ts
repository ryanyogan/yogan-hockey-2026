"use server";

import type { Play } from "@yogan-hockey/schemas";
import { isGameId } from "../../../../lib/game/page-state";
import { replayPlays } from "../../../../lib/replay";

/**
 * A finished game's plays from D1, for a page that was open when the game ended, or that opened
 * before the game could be archived. Null while there is nothing to replay yet; the page asks
 * again. It answers null instead of throwing for anything it cannot serve.
 */
export async function loadReplayPlays(gameId: string): Promise<Play[] | null> {
  // A Server Action is a public endpoint: what arrives is whatever was sent.
  if (typeof gameId !== "string" || !isGameId(gameId)) return null;
  try {
    return await replayPlays(gameId);
  } catch (error) {
    console.error(`Game ${gameId}: the replay could not be read`, error);
    return null;
  }
}
