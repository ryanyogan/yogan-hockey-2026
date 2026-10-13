import { slateDay } from "./game-time";
import type { Band, Call, PicksFigures, Tally, WeekFigures } from "./picks-figures";

/*
 * Every sentence and label the Picks page prints around its figures (#218). They follow
 * `prototypes/agate/copy.js`. The figures themselves are `picks-figures.ts`; the columns' words
 * are the model's (`piece-copy.ts` has the lines around them).
 */

export const PICKS_TITLE = "Picks";

/** Under the title: what a pick is, who makes it and how it is marked. */
export const PICKS_LEDE =
  "A model picks a winner for every game before it starts, for fun. Each pick is marked right or wrong against the final score, and none is ever changed.";

export const TONIGHT_LABEL = "Tonight's picks";
export const COLUMNS_LABEL = "From the picks desk";
export const SEASON_LABEL = "The season in figures";

/** The label over the week's figures: this week, or the last one that had a result. */
export const weekLabel = (week: Pick<WeekFigures, "current">): string =>
  week.current ? "This week in figures" : "The latest week in figures";

/** The week's days beside its label: "Mon Oct 5 to Sun Oct 11". */
export const weekSpan = (week: Pick<WeekFigures, "start" | "end">): string =>
  `${slateDay(week.start)} to ${slateDay(week.end)}`;

/** Two figures either side of an en dash that never part across lines: word joiners round it. */
const dashed = (first: number, second: number): string => `${first}\u2060–\u2060${second}`;

/** A record as the site prints one: right, an en dash, wrong. "29–14". */
export const record = ({ right, wrong }: Tally): string => dashed(right, wrong);

/** How often a tally was right, "67%", or nothing for a tally of no picks. */
export function share({ right, wrong }: Tally): string {
  const picks = right + wrong;
  return picks === 0 ? "" : `${Math.round((right / picks) * 100)}%`;
}

/** The run as a big figure and the words under it: 3, "right in a row". */
export function runWords(run: NonNullable<PicksFigures["run"]>): { figure: string; key: string } {
  return { figure: String(run.length), key: `${run.outcome} in a row` };
}

/** A band of chances as a row's name: "50–54%", "65% and up". */
export const bandLabel = ({ from, to }: Pick<Band, "from" | "to">): string =>
  to == null ? `${from}% and up` : `${from}–${to}%`;

export const SIDE_LABELS = { home: "Home team picked", road: "Road team picked" } as const;

/** A chance as the site prints one: whole, "58%". */
const chance = (winProbability: number): string => `${Math.round(winProbability)}%`;

const weekday = (date: string): string =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

/**
 * A call in one sentence, the winner's score first: "The Carolina Hurricanes, picked at 78% on
 * the road, beat the Philadelphia Flyers 4–1 on Monday." The names are D1's, whole.
 */
export function callSentence(call: Call): string {
  const { picked, opponent } = call.score;
  const where = call.pickedHome ? "at home" : "on the road";
  const how =
    picked > opponent
      ? `beat the ${call.opponent.name} ${dashed(picked, opponent)}`
      : `lost ${dashed(opponent, picked)} to the ${call.opponent.name}`;
  return `The ${call.picked.name}, picked at ${chance(call.winProbability)} ${where}, ${how} on ${weekday(call.date)}.`;
}

/**
 * The game a call's sentence links to, or null where the game has no page: a game's page is at
 * ESPN's event id, which is all digits, and fixture mode's sample finals (`sample-picks.ts`) are
 * games ESPN never had.
 */
export const callGameId = ({ gameId }: Pick<Call, "gameId">): string | null =>
  /^\d+$/.test(gameId) ? gameId : null;

export const BEST_CALL = "Best call";
export const WORST_CALL = "Worst call";

/** In place of the figures before any pick is decided. */
export function noFigures(awaiting: number): string {
  const first = "No pick has been decided yet this season. The figures start with the first final.";
  if (awaiting === 0) return first;
  return `${first} ${awaiting === 1 ? "One pick is" : `${awaiting} picks are`} waiting on ${awaiting === 1 ? "its game" : "their games"}.`;
}

/** In place of the figures when D1 did not answer. */
export const FIGURES_UNREAD = "The picks' figures could not be read just now.";
