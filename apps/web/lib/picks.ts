import type { FinalGame, GameStatus, SeasonRecord, StoredPrediction } from "@yogan-hockey/schemas";

/** What a game still to come says until its Prediction arrives. */
export const PICK_PENDING = "pick pending";

type Side = { id: string; abbreviation: string };
type PickedGame = { status: GameStatus; startTime: string; home: Side; away: Side };

/**
 * Whether a game with no row can still get a Prediction: it has not started, by its status or by
 * the clock. The Scoreboard makes no pick for a game whose start has passed, so one that is late
 * to drop the puck is not waiting for anything.
 */
export function awaitsPick(game: Pick<PickedGame, "status" | "startTime">, now: Date): boolean {
  return game.status === "scheduled" && new Date(game.startTime) > now;
}

/** The side a Prediction picked, or null: a failed or missing one, or a team not in the game. */
export function pickedSide<Game extends { home: Side; away: Side }>(
  prediction: StoredPrediction | null | undefined,
  game: Game,
): Game["home"] | Game["away"] | null {
  if (prediction?.status !== "made") return null;
  return [game.home, game.away].find((side) => side.id === prediction.pickTeamId) ?? null;
}

/**
 * The pick in one line, as a game row or card says it: "TOR 58%", the picked team and its win
 * probability. "pick pending" for a game still to start that has no row yet. Null, which is
 * nothing shown, for a failed Prediction and for a game that started without one. A live or
 * finished game keeps the line as it was made: right or wrong is the game page's to say.
 */
export function pickLine(
  prediction: StoredPrediction | null | undefined,
  game: PickedGame,
  now: Date,
): string | null {
  if (prediction == null) return awaitsPick(game, now) ? PICK_PENDING : null;
  const side = pickedSide(prediction, game);
  if (prediction.status !== "made" || side == null) return null;
  return `${side.abbreviation} ${Math.round(prediction.winProbability)}%`;
}

/**
 * The one-line picks of a slate by game id, as plain data a server component hands to the
 * browser. A game with nothing to say has no entry.
 */
export function slatePicks(
  games: readonly (PickedGame & { id: string })[],
  predictions: ReadonlyMap<string, StoredPrediction>,
  now: Date,
): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const game of games) {
    const line = pickLine(predictions.get(game.id), game, now);
    if (line != null) picks[game.id] = line;
  }
  return picks;
}

/**
 * A line the server drew, against the game's status as the socket now has it: the picks are as
 * old as the page's last render, and a game that has started since is no longer waiting for one.
 */
export function pickNote(line: string | undefined, status: GameStatus): string | undefined {
  return line === PICK_PENDING && status !== "scheduled" ? undefined : line;
}

/** The season record of the picks as the dashboard says it. Null until a pick has been decided. */
export function recordLine(record: SeasonRecord | null): string | null {
  if (record == null || record.right + record.wrong === 0) return null;
  return `picks: ${record.right} right, ${record.wrong} wrong`;
}

/**
 * How a finished game came out, beside its pick's mark: "Dallas Stars won 4-3". The score is the
 * final one, so the winner of a shootout has its extra goal.
 */
export function finalResult(final: FinalGame): string {
  const [winner, loser] =
    final.home.score > final.away.score ? [final.home, final.away] : [final.away, final.home];
  return `${winner.name} won ${winner.score}-${loser.score}`;
}

/** The month ESPN's season year turns over: a season runs from the summer to the next June. */
const FIRST_MONTH_OF_SEASON = 7;

/**
 * ESPN's season year for a slate's date (`YYYY-MM-DD`): the year the season ends in, so October
 * 2026 is 2027. It is what a `games` row's `season` holds.
 */
export function seasonOfSlate(date: string): number {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return month >= FIRST_MONTH_OF_SEASON ? year + 1 : year;
}
