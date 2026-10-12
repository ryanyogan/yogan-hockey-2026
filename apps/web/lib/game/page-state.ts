import type { Game, GameHeader, GameStatus, Play } from "@yogan-hockey/schemas";
import { RECONNECTING } from "../connection-drop";
import { type GameClock, timePlayed } from "./penalties";
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
  /**
   * The game clock as last heard, as time played, where the header or the Scoreboard has one:
   * what the penalty box counts down on between plays.
   */
  clock?: GameClock;
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
 * - "Reconnecting" in its place while the page's socket to the Agent is down, since nothing the
 *   Agent says arrives then. A finished game has no more to hear, so it says nothing.
 */
export function streamReading({
  header,
  plays,
  delayed,
  reconnecting = false,
  scoreboard,
}: {
  header: GameHeader;
  plays: readonly Play[];
  delayed: boolean;
  /** The socket to the Game Agent has been down for longer than a blip. */
  reconnecting?: boolean;
  /** The same game on the Scoreboard, when today's slate has it. */
  scoreboard?: Pick<Game, "status" | "period" | "clock">;
}): StreamReading {
  const reading: StreamReading = {};
  if (reconnecting && header.status !== "final") reading.notice = RECONNECTING;
  else if (delayed) reading.notice = UPDATES_DELAYED;
  if (header.status !== "live") return reading;

  const period = periodLabel(header.period, header.seasonType);
  const last = plays.at(-1);
  if (last?.type === "period-end") {
    reading.status = `End of ${periodLabel(last.period, header.seasonType)}`;
  } else if (period !== SHOOTOUT && header.clock === NO_CLOCK) {
    const agrees = scoreboard?.status === "live" && scoreboard.period === header.period;
    const heard = agrees && scoreboard.clock !== NO_CLOCK ? scoreboard.clock : null;
    reading.status = heard == null ? period : `${period} ${heard}`;
    if (heard != null) reading.clock = timePlayed(header.period, heard, header.seasonType);
  } else if (period !== SHOOTOUT) {
    reading.clock = timePlayed(header.period, header.clock, header.seasonType);
  }
  return reading;
}

/**
 * The header as the page's story reads it (`components/game/game-story.tsx`): a live game's clock
 * as `streamReading` has it. The copy takes a clock that has run out for an intermission ("Live ·
 * End 2nd", "Tied 2–2 after the 2nd"), and a header with no clock of its own says "0:00" all
 * through a period, so the kicker and the deck called every such period over while the rink under
 * them counted it down.
 *
 * - The last play ends a period: that period, run out, which is an intermission.
 * - The header has a clock: as it is.
 * - It has none and the Scoreboard has the same game in the same period: the Scoreboard's.
 * - Nobody has one: no clock at all, and the copy writes the period alone ("Live · 2nd").
 */
export function storyHeader({
  header,
  plays,
  scoreboard,
}: {
  header: GameHeader;
  plays: readonly Play[];
  scoreboard?: Pick<Game, "status" | "period" | "clock">;
}): GameHeader {
  if (header.status !== "live") return header;
  const last = plays.at(-1);
  if (last?.type === "period-end") return { ...header, period: last.period, clock: NO_CLOCK };
  if (header.clock !== NO_CLOCK) return header;
  const agrees = scoreboard?.status === "live" && scoreboard.period === header.period;
  return { ...header, clock: agrees && scoreboard.clock !== NO_CLOCK ? scoreboard.clock : "" };
}
