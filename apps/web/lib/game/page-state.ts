import type { Game, GameHeader, GameStatus, Play } from "@yogan-hockey/schemas";
import { periodLabel, SHOOTOUT } from "./timeline";

/**
 * Which of its states `/nhl/games/:id` is in. The page moves through them in this order without
 * a reload, and never back:
 *
 * - `scheduled`: the matchup and the pick. No socket to the Game Agent.
 * - `live`: the Game Stream, on the Game Agent's socket, intermissions included.
 * - `finished`: the game is over. The Replay (#51) is drawn here.
 */
export type GamePhase = "scheduled" | "live" | "finished";

/** Whether `id` could be an ESPN event id: anything else is not found without asking anyone. */
export function isGameId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * Whether the page opens its socket to the Game Agent, given the game's status when the server
 * read it and its status on the Scoreboard now (undefined when today's slate does not have it).
 *
 * A socket is what makes the Agent poll, so a game still to come has none: the Scoreboard, which
 * every page already follows, is what says the game has started. The page keeps the answer once
 * it is true (see `GamePage`), because the slate moves on to another day while a page stays open.
 */
export function streamStarts(status: GameStatus, onScoreboard: GameStatus | undefined): boolean {
  if (status === "live") return true;
  // A page left open through the whole game learns how it ended from the Agent as well.
  return status === "scheduled" && (onScoreboard === "live" || onScoreboard === "final");
}

/**
 * The page's state for the newest status it knows: the stream's header once the socket is open,
 * the server's until then. A page whose socket has just opened still shows the matchup until the
 * Agent's header says the game is on. A game called off keeps its matchup.
 */
export function gamePhase(status: GameStatus): GamePhase {
  if (status === "final") return "finished";
  return status === "live" ? "live" : "scheduled";
}

export const UPDATES_DELAYED = "Updates delayed";

/** The clock of a header that has none: what the translation writes when ESPN sends no clock. */
const NO_CLOCK = "0:00";

/** What the Game Stream writes over centre ice in place of the header's own period and clock. */
export type StreamReading = {
  /** Replaces the period and clock: "End of 2nd", "2nd 12:34", "2nd". */
  status?: string;
  /** A warning under it. */
  notice?: string;
};

/**
 * The words over centre ice for a game on the stream.
 *
 * - An intermission is a live game whose last play ends a period, as the Game Agent has it:
 *   "End of 2nd".
 * - The clock is the header's when it has one. The recorded summaries carry none ("0:00"), and
 *   then it is the Scoreboard's for the same game and period (time left, as the ticker shows it),
 *   and failing that the period alone, since "2nd 0:00" would read as a period that is over.
 * - "Updates delayed" when the Agent reports a stall.
 */
export function streamReading({
  header,
  plays,
  delayed,
  scoreboard,
}: {
  header: GameHeader;
  plays: readonly Play[];
  delayed: boolean;
  /** The same game on the Scoreboard, when today's slate has it. */
  scoreboard?: Pick<Game, "status" | "period" | "clock">;
}): StreamReading {
  const reading: StreamReading = {};
  if (delayed) reading.notice = UPDATES_DELAYED;
  if (header.status !== "live") return reading;

  const period = periodLabel(header.period, header.seasonType);
  const last = plays.at(-1);
  if (last?.type === "period-end") {
    reading.status = `End of ${periodLabel(last.period, header.seasonType)}`;
  } else if (period !== SHOOTOUT && header.clock === NO_CLOCK) {
    const agrees = scoreboard?.status === "live" && scoreboard.period === header.period;
    reading.status =
      agrees && scoreboard.clock !== NO_CLOCK ? `${period} ${scoreboard.clock}` : period;
  }
  return reading;
}
