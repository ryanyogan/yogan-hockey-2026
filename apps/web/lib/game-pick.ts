import { env } from "cloudflare:workers";
import { createDb, getFinalGame, getPrediction } from "@yogan-hockey/db";
import type { FinalGame, GameHeader, MadePrediction } from "@yogan-hockey/schemas";
import { gamePhase } from "./game/page-state";
import { awaitsPick, pickedSide } from "./picks";

/**
 * What a game page shows for its pick:
 * - `made`: the Prediction, with the game's final score from D1 once it is written, which is
 *   what marks the pick right or wrong;
 * - `pending`: a game still to start with no row yet;
 * - `none`: a failed Prediction, a game that started without one, or a pick for a team that is
 *   not in the game. Nothing is shown.
 */
export type GamePickReading =
  | { state: "made"; prediction: MadePrediction; final: FinalGame | null }
  | { state: "pending" }
  | { state: "none" };

/**
 * A game's pick, read from D1 by its page's server component (prediction rows are behind no
 * cache tag). The pick is an extra: when D1 cannot be read the page is drawn without it.
 */
export async function readGamePick(
  header: Pick<GameHeader, "id" | "status" | "startTime"> & {
    home: Pick<GameHeader["home"], "id" | "abbreviation">;
    away: Pick<GameHeader["away"], "id" | "abbreviation">;
  },
  now: Date = new Date(),
): Promise<GamePickReading> {
  try {
    const db = createDb(env.DB);
    const finished = gamePhase(header.status) === "finished";
    const [prediction, final] = await Promise.all([
      getPrediction(db, header.id),
      // Only a finished game has a row: the Scoreboard writes it at the final, and the route
      // of a game nobody watched has archived it before asking here.
      finished ? getFinalGame(db, header.id) : null,
    ]);
    if (prediction == null) return { state: awaitsPick(header, now) ? "pending" : "none" };
    if (prediction.status !== "made" || pickedSide(prediction, header) == null) {
      return { state: "none" };
    }
    return { state: "made", prediction, final };
  } catch (error) {
    console.error(`Game ${header.id}: the pick could not be read`, error);
    return { state: "none" };
  }
}
