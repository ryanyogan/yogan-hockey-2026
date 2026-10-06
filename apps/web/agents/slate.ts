import type { Game, Scoreboard, ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";

/** While a game is live or about to start. */
export const FAST_POLL_SECONDS = 30;
/** The rest of the time. */
export const SLOW_POLL_SECONDS = 5 * 60;
/** How long before a scheduled start the fast cadence begins. */
const PREGAME_MS = 15 * 60 * 1000;

/**
 * Seconds until the Scoreboard's next poll: 30 while a game is live or within 15 minutes of its
 * scheduled start, 5 minutes otherwise, and sooner than 5 minutes when a game comes within 15
 * minutes of its start before then, so the fast cadence begins on time. A game still `scheduled`
 * after its start time is about to start, so it counts as within 15 minutes.
 */
export function scoreboardPollSeconds(games: ScoreboardGame[], now: number): number {
  let seconds = SLOW_POLL_SECONDS;
  for (const game of games) {
    if (game.status === "live") return FAST_POLL_SECONDS;
    if (game.status !== "scheduled") continue;
    const untilPregame = Math.ceil((Date.parse(game.startTime) - PREGAME_MS - now) / 1000);
    seconds = Math.min(seconds, Math.max(FAST_POLL_SECONDS, untilPregame));
  }
  return seconds;
}

function scoreboardSide(side: Game["home"]): ScoreboardSide {
  const { id, abbreviation, logo, logoDark, score, winner, record } = side;
  return { id, abbreviation, logo, logoDark, score, winner, record };
}

/** A game cut down to what the Scoreboard pushes to every open page. */
export function scoreboardGame(game: Game): ScoreboardGame {
  const { id, startTime, seasonType, status, period, clock, detail, venue, broadcasts } = game;
  return {
    id,
    startTime,
    seasonType,
    status,
    period,
    clock,
    detail,
    venue,
    broadcasts,
    home: scoreboardSide(game.home),
    away: scoreboardSide(game.away),
  };
}

/**
 * Something the Scoreboard acts on, found by comparing a new slate with the games it had.
 *
 * - `first-seen`: the game was not there before. Its Prediction starts here.
 * - `went-final`: the game is `final` and was not before. A game first seen already final is
 *   both, since it ended with nobody watching and still has to be recorded.
 *
 * Each carries the whole `Game` from ESPN, which is what the D1 row is written from.
 */
export type SlateTransition = { kind: "first-seen" | "went-final"; game: Game };

/** The transitions from the games the Scoreboard had to a new slate, in the slate's order. */
export function slateTransitions(previous: ScoreboardGame[], slate: Scoreboard): SlateTransition[] {
  const before = new Map(previous.map((game) => [game.id, game.status]));
  return slate.games.flatMap((game) => {
    const transitions: SlateTransition[] = [];
    if (!before.has(game.id)) transitions.push({ kind: "first-seen", game });
    if (game.status === "final" && before.get(game.id) !== "final") {
      transitions.push({ kind: "went-final", game });
    }
    return transitions;
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The `YYYY-MM-DD` date after one. */
export function dayAfter(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

/**
 * The dates a catch-up fetches in one go: from `from` up to the day before `today`, oldest first,
 * and no more than `limit` of them. All dates are `YYYY-MM-DD`.
 */
export function missedDates(from: string, today: string, limit: number): string[] {
  const dates: string[] = [];
  for (let date = from; date < today && dates.length < limit; date = dayAfter(date)) {
    dates.push(date);
  }
  return dates;
}
