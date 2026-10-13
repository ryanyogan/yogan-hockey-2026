import { type FinalGameTeam, pickOutcome, type SeasonPick } from "@yogan-hockey/schemas";

/*
 * Every figure the Picks page prints (#218), worked out here and nowhere else from a season's
 * picks and their finals as D1 holds them (`getSeasonPicks`). Nothing here reads a clock or a
 * database: `today` is the slate's date, handed in.
 *
 * A pick is decided when its game has a final score with a winner. Anything else is a pick still
 * waiting: a game to come or in progress, a postponed one, one never played. It is counted in
 * `awaiting` and in no other figure.
 */

/** How many picks were right and how many wrong. */
export type Tally = { right: number; wrong: number };

/**
 * How sure a pick was, in four bands. The Prediction's prompt says most honest picks fall between
 * 52 and 68, so the bands are five points wide across that and open above it. `to` null is no
 * upper edge. A chance between two whole numbers is in the band of the one below it.
 */
export const BANDS = [
  { from: 50, to: 54 },
  { from: 55, to: 59 },
  { from: 60, to: 64 },
  { from: 65, to: null },
] as const satisfies readonly { from: number; to: number | null }[];
export type Band = { from: number; to: number | null } & Tally;

/** A team as a call names it. */
type CallTeam = Pick<FinalGameTeam, "id" | "abbreviation" | "name">;

/** One decided pick, as much as a sentence about it needs. */
export type Call = {
  gameId: string;
  /** The day the game is listed under: `YYYY-MM-DD` in US Eastern time. */
  date: string;
  picked: CallTeam;
  opponent: CallTeam;
  pickedHome: boolean;
  winProbability: number;
  score: { picked: number; opponent: number };
};

export type WeekFigures = {
  /** The week's Monday and Sunday: `YYYY-MM-DD`. */
  start: string;
  end: string;
  /** Whether it is the week `today` is in, and not an earlier one shown in its place. */
  current: boolean;
  tally: Tally;
  /** Each day of the week that had a decided pick, in order. */
  days: ({ date: string } & Tally)[];
  /** The firmest pick that came in, or null in a week with nothing right. */
  best: Call | null;
  /** The firmest pick that lost, or null in a week with nothing wrong. */
  worst: Call | null;
};

export type PicksFigures = {
  season: Tally;
  /** Picks with no result yet. */
  awaiting: number;
  /** The latest picks that ended the same way, or null before any is decided. */
  run: { outcome: "right" | "wrong"; length: number } | null;
  /** This week, or the last week with a result when this one has none; null before any. */
  week: WeekFigures | null;
  /** The season by how sure the pick was: every band, counted or not. */
  bands: Band[];
  /** The season by which team was picked. */
  sides: { home: Tally; road: Tally };
};

const DAY = 86_400_000;
const dayAt = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** The Monday-to-Sunday week a day (`YYYY-MM-DD`) is in. */
export function weekOf(date: string): { start: string; end: string } {
  // getUTCDay: Sunday is 0. Monday is 0 here.
  const sinceMonday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = dayAt(date, -sinceMonday);
  return { start, end: dayAt(start, 6) };
}

type Decided = Call & { outcome: "right" | "wrong"; startTime: string };

function decided(pick: SeasonPick): Decided | null {
  const { final } = pick;
  const outcome = pickOutcome({ status: "made", ...pick }, final);
  if (final == null || outcome == null) return null;
  const pickedHome = pick.pickTeamId === final.home.id;
  const [picked, opponent] = pickedHome ? [final.home, final.away] : [final.away, final.home];
  const team = ({ id, abbreviation, name }: FinalGameTeam): CallTeam => ({
    id,
    abbreviation,
    name,
  });
  return {
    gameId: pick.gameId,
    date: final.date,
    picked: team(picked),
    opponent: team(opponent),
    pickedHome,
    winProbability: pick.winProbability,
    score: { picked: picked.score, opponent: opponent.score },
    outcome,
    startTime: final.startTime,
  };
}

function tally(calls: readonly Decided[]): Tally {
  const right = calls.filter((call) => call.outcome === "right").length;
  return { right, wrong: calls.length - right };
}

/** The band a chance is in: the last whose lower edge it reaches, and the first under them all. */
const bandOf = (chance: number): number =>
  Math.max(
    0,
    BANDS.findLastIndex((band) => Math.floor(chance) >= band.from),
  );

/** The firmest of some calls: the highest chance, then the wider margin, then the later game. */
function firmest(calls: readonly Decided[]): Call | null {
  const margin = (call: Decided) => Math.abs(call.score.picked - call.score.opponent);
  const [first] = calls.toSorted(
    (a, b) =>
      b.winProbability - a.winProbability ||
      margin(b) - margin(a) ||
      b.startTime.localeCompare(a.startTime) ||
      b.gameId.localeCompare(a.gameId),
  );
  if (first == null) return null;
  const { outcome: _outcome, startTime: _startTime, ...call } = first;
  return call;
}

/**
 * The week the page shows and its decided picks: the week of the latest game played by today,
 * which is this one or the last that had a result. Null before any pick is decided.
 */
function shownWeek(calls: readonly Decided[], today: string) {
  const thisWeek = weekOf(today);
  const latest = calls.findLast((call) => call.date <= thisWeek.end);
  if (latest == null) return null;
  const { start, end } = weekOf(latest.date);
  const inWeek = calls.filter((call) => call.date >= start && call.date <= end);
  return { start, end, current: start === thisWeek.start, inWeek };
}

function weekFigures(calls: readonly Decided[], today: string): WeekFigures | null {
  const week = shownWeek(calls, today);
  if (week == null) return null;
  const { start, end, current, inWeek } = week;
  const dates = [...new Set(inWeek.map((call) => call.date))].sort();
  return {
    start,
    end,
    current,
    tally: tally(inWeek),
    days: dates.map((date) => ({ date, ...tally(inWeek.filter((call) => call.date === date)) })),
    best: firmest(inWeek.filter((call) => call.outcome === "right")),
    worst: firmest(inWeek.filter((call) => call.outcome === "wrong")),
  };
}

/** The decided picks of a season in the order their games were played, whatever order they came in. */
const decidedCalls = (picks: readonly SeasonPick[]): Decided[] =>
  picks
    .map(decided)
    .filter((call) => call != null)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime) ||
        a.gameId.localeCompare(b.gameId),
    );

/**
 * What the last column on a miss was written about (#234): the slate's date on the morning it
 * was written, and its game, or null where the piece does not say which game it was.
 */
export type LastMiss = { date: string; gameId: string | null };

/**
 * The miss a column is written about (#234): the firmest pick that lost in the week the page
 * shows, among the games decided since the last such column, and never that column's own game.
 * A column is written before its day's games, so a game listed under the column's date or a
 * later one was decided after it. With no column yet (`last` null) it is the week's worst call;
 * with nothing lost since the last one it is null, and no column is written.
 *
 * The week's worst call on the page (`week.worst`) does not move for any of this.
 */
export function missSince(
  picks: readonly SeasonPick[],
  today: string,
  last: LastMiss | null,
): Call | null {
  const misses = (shownWeek(decidedCalls(picks), today)?.inWeek ?? []).filter(
    (call) => call.outcome === "wrong",
  );
  if (last == null) return firmest(misses);
  return firmest(misses.filter((call) => call.date >= last.date && call.gameId !== last.gameId));
}

/**
 * The page's figures, from a season's picks and the slate's date. The picks may come in any
 * order: a run and a week follow the games' own start times.
 */
export function picksFigures(picks: readonly SeasonPick[], today: string): PicksFigures {
  const calls = decidedCalls(picks);

  const last = calls.at(-1);
  const sinceTurn = calls.findLastIndex((call) => call.outcome !== last?.outcome);

  return {
    season: tally(calls),
    awaiting: picks.length - calls.length - picks.filter(noWinner).length,
    run: last ? { outcome: last.outcome, length: calls.length - 1 - sinceTurn } : null,
    week: weekFigures(calls, today),
    bands: BANDS.map((band, index) => ({
      ...band,
      ...tally(calls.filter((call) => bandOf(call.winProbability) === index)),
    })),
    sides: {
      home: tally(calls.filter((call) => call.pickedHome)),
      road: tally(calls.filter((call) => !call.pickedHome)),
    },
  };
}

/** A final with the score level: no winner to mark the pick against, and nothing to wait for. */
const noWinner = ({ final }: SeasonPick): boolean =>
  final != null && final.home.score === final.away.score;
