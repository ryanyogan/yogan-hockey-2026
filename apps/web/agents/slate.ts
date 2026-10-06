import type { Game, Scoreboard, ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";

/** While a game is live or about to start. */
export const FAST_POLL_SECONDS = 30;
/** The rest of the time. */
export const SLOW_POLL_SECONDS = 5 * 60;
/** How long before a scheduled start the fast cadence begins. */
const PREGAME_MS = 15 * 60 * 1000;

/**
 * The Scoreboard's cadence: every 30 seconds while a game is live or within 15 minutes of its
 * scheduled start, every 5 minutes otherwise. A game still `scheduled` after its start time is
 * about to start, so it counts.
 */
export function scoreboardPollSeconds(games: ScoreboardGame[], now: number): number {
  const fast = games.some(
    (game) =>
      game.status === "live" ||
      (game.status === "scheduled" && Date.parse(game.startTime) - now <= PREGAME_MS),
  );
  return fast ? FAST_POLL_SECONDS : SLOW_POLL_SECONDS;
}

function scoreboardSide(side: Game["home"]): ScoreboardSide {
  const { id, abbreviation, shortName, logo, logoDark, score, winner } = side;
  return { id, abbreviation, shortName, logo, logoDark, score, winner };
}

/** A game cut down to what the Scoreboard pushes to every open page. */
export function scoreboardGame(game: Game): ScoreboardGame {
  const { id, startTime, seasonType, status, period, clock, detail } = game;
  return {
    id,
    startTime,
    seasonType,
    status,
    period,
    clock,
    detail,
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
