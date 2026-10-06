import type { ScoreboardGame, ScoreboardState } from "@yogan-hockey/schemas";

/*
 * How the Scoreboard's games read on a page: the status line of a game, the sections of
 * `/nhl/live`, the ticker's order. Nothing here touches the server, so client components use it.
 */

/**
 * Times are shown in Eastern time and say so. The NHL counts a slate's date in Eastern time, and
 * the server, which draws the first paint, cannot know the visitor's own zone.
 */
const TIME_ZONE = "America/New_York";
const ZONE_LABEL = "ET";

const PLAYOFFS = 3;
const REGULATION_PERIODS = 3;
const SHOOTOUT_PERIOD = 5;

function timeParts(iso: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, ...options }).formatToParts(
    new Date(iso),
  );
  // Put together from parts, because the space before "PM" differs between runtimes.
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function startTimeLabel(startTime: string): string {
  const { hour, minute, dayPeriod } = timeParts(startTime, { hour: "numeric", minute: "2-digit" });
  return `${hour}:${minute} ${dayPeriod} ${ZONE_LABEL}`;
}

/** "20:14:07 ET": when the Scoreboard last saw a change. Null before its first poll. */
export function updatedLabel(updatedAt: string | null): string | null {
  if (updatedAt == null) return null;
  const { hour, minute, second } = timeParts(updatedAt, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return `${hour}:${minute}:${second} ${ZONE_LABEL}`;
}

/** "Tue, Oct 6": a slate's date, which is a calendar day and has no time zone of its own. */
export function slateDateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Where a game's page is, whatever state the game is in. */
export const gameHref = (game: ScoreboardGame) => `/nhl/games/${game.id}`;

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
 * A game's status in a few characters, as a game row and a ticker entry show it: "7:00 PM ET",
 * "2nd 12:34", "end 2nd", "SO", "final/OT", "postponed".
 */
export function gameStatusLine(game: ScoreboardGame): string {
  switch (game.status) {
    case "scheduled":
      return startTimeLabel(game.startTime);
    case "live":
      return liveLine(game);
    case "final":
      return finalLine(game);
    case "postponed":
      // ESPN's own word says which: postponed, canceled or suspended.
      return game.detail.trim().toLowerCase() || "postponed";
  }
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

/**
 * The ids of the games that are final in `next` and were not in `previous`: what a page shows
 * about them from the server (standings, a team's record, the Replay) is now out of date. A change
 * of slate is not a final: the page has not shown the new day's games as anything else.
 */
export function newFinals(previous: ScoreboardState, next: ScoreboardState): string[] {
  if (previous.date !== next.date) return [];
  const alreadyFinal = new Set(
    previous.games.filter((game) => game.status === "final").map((game) => game.id),
  );
  return next.games
    .filter((game) => game.status === "final" && !alreadyFinal.has(game.id))
    .map((game) => game.id);
}
