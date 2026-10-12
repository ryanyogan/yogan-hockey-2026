import type { MadePrediction, Pregame } from "@yogan-hockey/schemas";
import { cachedGamePregame } from "./espn";
import { type FoundGame, findGame, type GameLookup } from "./find-game";
import { gamePhase } from "./game/page-state";
import { type GamePickReading, readGamePick } from "./game-pick";
import { replayGame } from "./replay";

/**
 * Everything `/nhl/games/:id` and its tabs draw, from one read of the Game Agent:
 * - `found`: the game (a finished one made ready for its Replay, with D1's plays), its pick, and
 *   the matchup facts, which only a game still to come shows;
 * - `missing`: no such game, which is the "game not found" page;
 * - `unreadable`: a game that may well exist and could not be read just now, which the page says
 *   in words.
 */
export type GamePageRead =
  | { state: "found"; game: FoundGame; pick: GamePagePick; pregame: Pregame | null }
  | { state: "missing" }
  | { state: "unreadable" };

/**
 * A Prediction as a page is sent it: without what the model was given to make it (`inputs`),
 * which no page draws and which is not the browser's to have.
 */
export type PagePrediction = Omit<MadePrediction, "inputs">;

/** A game's pick (`lib/game-pick.ts`) as its page is sent it. */
export type GamePagePick =
  | (Omit<Extract<GamePickReading, { state: "made" }>, "prediction"> & {
      prediction: PagePrediction;
    })
  | Exclude<GamePickReading, { state: "made" }>;

/** The reads behind a game page, which a test replaces. */
export type GamePageReads = {
  find: (id: string) => Promise<GameLookup>;
  replay: (game: FoundGame) => Promise<FoundGame>;
  pick: (header: FoundGame["header"]) => Promise<GamePickReading>;
  pregame: (gameId: string) => Promise<Pregame>;
};

const READS: GamePageReads = {
  find: findGame,
  replay: replayGame,
  pick: readGamePick,
  pregame: cachedGamePregame,
};

/**
 * Reads a game page. The Game Agent is asked once, and the title and the page are both drawn
 * from the one answer.
 */
export async function readGamePage(
  id: string,
  reads: GamePageReads = READS,
): Promise<GamePageRead> {
  const found = await reads.find(id);
  if (found.state !== "found") return found;
  // A game already over is the Replay, which draws D1's plays: a game nobody watched is archived
  // here, on its first open, and every later open is one read of D1.
  const game = await reads.replay(found.game);
  const scheduled = gamePhase(game.header.status) === "scheduled";
  const [pick, pregame] = await Promise.all([
    // After `replay`, which writes a finished game nobody watched: its D1 row marks the pick.
    reads.pick(game.header).then(pagePick),
    scheduled ? matchupFacts(game.header.id, reads.pregame) : null,
  ]);
  return { state: "found", game, pick, pregame };
}

function pagePick(pick: GamePickReading): GamePagePick {
  if (pick.state !== "made") return pick;
  const { inputs: _inputs, ...prediction } = pick.prediction;
  return { ...pick, prediction };
}

/** The matchup facts, which only a game still to come shows. They never take the page down. */
async function matchupFacts(
  gameId: string,
  read: GamePageReads["pregame"],
): Promise<Pregame | null> {
  try {
    return await read(gameId);
  } catch (error) {
    console.error(`Game ${gameId}: the matchup could not be read`, error);
    return null;
  }
}
