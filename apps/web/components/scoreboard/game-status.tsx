import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { gameStatusLine } from "../../lib/scoreboard-view";
import { LocalTime } from "../local-time";

/**
 * A game's status as text: for a game still to be played the time it starts, in the visitor's own
 * time zone; otherwise its status line ("2nd 12:34", "final/OT", "postponed").
 */
export function GameStatus({ game }: { game: ScoreboardGame }) {
  return gameStatusLine(game) ?? <LocalTime at={game.startTime} show="time" />;
}
