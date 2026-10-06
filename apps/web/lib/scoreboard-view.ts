import type { ScoreboardGame, ScoreboardHeard } from "@yogan-hockey/schemas";

/*
 * How the Scoreboard's games read on a page: the status line of a game, the sections of
 * `/nhl/live`, the ticker's order. Nothing here touches the server, so client components use it.
 * Times are not written here: `lib/game-time.ts` formats them and `LocalTime` shows them.
 */

const PLAYOFFS = 3;
const REGULATION_PERIODS = 3;
const SHOOTOUT_PERIOD = 5;

/** Where a game's page is, whatever state the game is in. */
export const gameHref = (game: Pick<ScoreboardGame, "id">) => `/nhl/games/${game.id}`;

/** A game has a score to show once it has started; a postponed game never did. */
export const hasScore = (game: ScoreboardGame) => game.status === "live" || game.status === "final";

/** A clock with no time left on it, however it is written: "0:00", "00:00", "0.0". */
const RUN_OUT = /^[0:.]+$/;

const inShootout = (game: ScoreboardGame) =>
  game.period === SHOOTOUT_PERIOD && game.seasonType !== PLAYOFFS;

/** "1st", "2nd", "3rd", "OT", "SO"; a playoff game plays overtimes until someone scores. */
function periodLabel(game: ScoreboardGame): string {
  const { period } = game;
  if (period <= REGULATION_PERIODS) return ["", "1st", "2nd", "3rd"][period] ?? "";
  if (inShootout(game)) return "SO";
  const overtime = period - REGULATION_PERIODS;
  return overtime === 1 ? "OT" : `${overtime}OT`;
}

function liveLine(game: ScoreboardGame): string {
  const period = periodLabel(game);
  // ESPN calls a game live from the warm-up, before it has a period.
  if (period === "") return "live";
  // A shootout has no clock.
  if (inShootout(game)) return period;
  // The clock counts down, so at zero the period is over: an intermission.
  if (RUN_OUT.test(game.clock)) return `end ${period}`;
  return `${period} ${game.clock}`;
}

function finalLine(game: ScoreboardGame): string {
  return game.period > REGULATION_PERIODS ? `final/${periodLabel(game)}` : "final";
}

/**
 * A game's status in a few characters, as a game row and a ticker entry show it: "2nd 12:34",
 * "end 2nd", "SO", "final/OT", "postponed". Null for a game still to be played: its status is its
 * start time, which is the visitor's own and so is drawn by `GameStatus`, not written here.
 */
export function gameStatusLine(game: ScoreboardGame): string | null {
  switch (game.status) {
    case "scheduled":
      return null;
    case "live":
      return liveLine(game);
    case "final":
      return finalLine(game);
    case "postponed":
      // ESPN's own word says which: postponed, canceled or suspended.
      return game.detail.trim().toLowerCase() || "postponed";
  }
}

/** "Scotiabank Arena · ESPN+, TNT": where a game is played and where it is shown. */
export function gameWhere(game: Pick<ScoreboardGame, "venue" | "broadcasts">): string {
  const broadcasts = game.broadcasts?.join(", ");
  return [game.venue, broadcasts].filter(Boolean).join(" · ");
}

/** A slate split by where each game stands, each part in order of start time. */
export type SlateSections = Record<"live" | "upcoming" | "final" | "postponed", ScoreboardGame[]>;

const SECTION_OF = {
  live: "live",
  scheduled: "upcoming",
  final: "final",
  postponed: "postponed",
} as const satisfies Record<ScoreboardGame["status"], keyof SlateSections>;

/**
 * The sections of `/nhl/live`. A postponed game has a section of its own: it is neither to come
 * today nor played to a result.
 */
export function slateSections(games: ScoreboardGame[]): SlateSections {
  const sections: SlateSections = { live: [], upcoming: [], final: [], postponed: [] };
  // The sort is stable, so games starting together keep the slate's order.
  const byStart = games.toSorted((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  for (const game of byStart) sections[SECTION_OF[game.status]].push(game);
  return sections;
}

/** The ticker's order: what is on, then what is to come, then what is over. */
export function tickerGames(games: ScoreboardGame[]): ScoreboardGame[] {
  const { live, upcoming, final, postponed } = slateSections(games);
  return [...live, ...upcoming, ...final, ...postponed];
}

/** The later of two times (ISO, UTC), either of which may be missing. */
export function laterOf(a: string | null, b: string | null): string | null {
  if (a == null || b == null) return a ?? b;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

/**
 * The time in a message on the Scoreboard's socket that says a poll reached ESPN and found nothing
 * new (`ScoreboardHeard`). Null for any other message.
 */
export function heardAtFrom(data: unknown): string | null {
  if (typeof data !== "string") return null;
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== "object" || message === null) return null;
    const { type, at } = message as Partial<ScoreboardHeard>;
    if (type !== "scoreboard_heard" || typeof at !== "string") return null;
    return Number.isNaN(Date.parse(at)) ? null : at;
  } catch {
    return null;
  }
}

/** A box that scrolls sideways, as the DOM measures it. */
type ScrollStrip = Pick<Element, "scrollLeft" | "scrollWidth" | "clientWidth">;
/** What a wheel event says, as the DOM reports it. */
type WheelTurn = Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode" | "shiftKey" | "ctrlKey">;

/** `WheelEvent.deltaMode`: the wheel reports lines, or pages, where most report pixels. */
const WHEEL_LINES = 1;
const WHEEL_PAGES = 2;
/** The height a wheel means by one line. */
const WHEEL_LINE_PX = 16;

/** How many pixels one unit of a wheel's turn is worth. */
function wheelUnitPx(deltaMode: number, pagePx: number): number {
  if (deltaMode === WHEEL_LINES) return WHEEL_LINE_PX;
  return deltaMode === WHEEL_PAGES ? pagePx : 1;
}

/**
 * Where a turn of a vertical wheel puts a strip that scrolls sideways, so a mouse with no sideways
 * wheel reaches what is past the edge: its new `scrollLeft`. Null when the wheel is the browser's
 * to handle: the strip fits, the gesture is sideways already, shift or control is held, or the
 * strip is at the end the wheel is turning towards, from where the page scrolls as usual.
 */
export function wheelScrollLeft(strip: ScrollStrip, wheel: WheelTurn): number | null {
  if (wheel.ctrlKey || wheel.shiftKey) return null;
  if (wheel.deltaY === 0 || Math.abs(wheel.deltaX) >= Math.abs(wheel.deltaY)) return null;
  const end = strip.scrollWidth - strip.clientWidth;
  const distance = wheel.deltaY * wheelUnitPx(wheel.deltaMode, strip.clientWidth);
  // Within a pixel of an end is at it: a zoomed browser stops a fraction short.
  const atEnd = distance > 0 ? strip.scrollLeft >= end - 1 : strip.scrollLeft <= 1;
  return atEnd ? null : Math.min(end, Math.max(0, strip.scrollLeft + distance));
}
