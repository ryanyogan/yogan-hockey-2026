import type { Play } from "@yogan-hockey/schemas";
import { SHOOTOUT } from "./timeline";

/*
 * Who is in the penalty box and who has the advantage, worked out from the plays.
 *
 * ESPN records a penalty as a play: the team, the player (the first one named), the infraction
 * (the play's type) and the minutes. It records no play when a penalty ends and none saying who
 * is on the ice, so the rest is the rule book, and the rules followed are these:
 *
 * - A minor (2 minutes) puts its team a skater short, and ends early when the other team scores
 *   while it has more skaters. Of several, the one with the least time left ends.
 * - A double minor (4) is two minors one after the other: such a goal ends the one being served.
 * - A major (5) puts its team a skater short and no goal ends it.
 * - A misconduct (10 or more) puts a player in the box and leaves the skaters as they were. A
 *   game misconduct sends its player off, not to the box, so it shows nothing.
 * - Penalties of the same length given to both teams at the same stoppage are coincidental: the
 *   players sit, nobody is a skater short for them, and no goal ends them. The exception is the
 *   rule book's own: one minor each with both teams at full strength is played four on four.
 *   Not followed: the rule book also cancels a minor against half of a double minor. Here each is
 *   served, which is four on four and then the same two minutes of advantage, later.
 * - A team is never more than two skaters short. A third penalty waits for the first to end.
 * - A player given two at once serves them one after the other, a misconduct last; but one that
 *   leaves his team short does not wait behind a coincidental one, since a teammate serves it.
 * - 10 minutes or more is read as a misconduct. ESPN's wording of a game misconduct, and whether
 *   it ever records a minor and a misconduct as one play of 12, are not in any recording.
 * - A penalty runs on the game clock, across an intermission into the next period.
 * - Overtime outside the playoffs is three on three, and a penalty there adds a skater to the
 *   other team instead of taking one away: 4 on 3, then 5 on 3. Playoff overtime is as regulation.
 * - A shootout has no penalties running, and neither has a game that is over. Overtime outside
 *   the playoffs is followed by a shootout, so its end is the end of every penalty.
 * - A penalty with no minutes recorded (a penalty shot is 0; a game stored before the site kept
 *   the minutes has none) puts nobody in the box.
 */

const PERIOD = 20 * 60;
const SHORT_OVERTIME = 5 * 60;
const REGULATION_PERIODS = 3;
const PLAYOFFS = 3;
const MINOR = 2 * 60;
const FULL_STRENGTH = 5;
const OVERTIME_STRENGTH = 3;
/** A team is never more than this many skaters short. */
const MOST_SHORT = 2;

export type PenaltyKind = "minor" | "double-minor" | "major" | "misconduct";

/** One player in the box. */
export type BoxedPenalty = {
  /** The penalty's play. */
  playId: string;
  teamId: string;
  /** The player's short name, "R. Faksa"; null for a penalty that names nobody (a bench minor). */
  player: string | null;
  /** The infraction as ESPN words it: "High-sticking". */
  infraction: string;
  minutes: number;
  kind: PenaltyKind;
  /** Seconds of it left on the game clock. */
  remaining: number;
  /** Its time has not started: it waits behind another penalty. */
  waiting: boolean;
  /** The team is a skater short for it. False for a misconduct and for coincidental penalties. */
  shortHanded: boolean;
};

export type Skaters = { home: number; away: number };

export type PenaltyState = {
  /** Everyone in the box, in the order the penalties were given. */
  box: BoxedPenalty[];
  /** Skaters a side, goalies not counted: 5 and 5 with nobody short. */
  skaters: Skaters;
  /** The team with more skaters, and the seconds until the first penalty giving it that is up. */
  advantage: { teamId: string; remaining: number } | null;
  /** The period the state is of: the last play's, or a later clock's. */
  period: number;
};

/** The game a penalty state is of. */
export type PenaltyGame = { homeTeamId: string; awayTeamId: string; seasonType: number };

/** A moment on the game clock: a period, and the seconds played of it. */
export type GameClock = { period: number; elapsed: number };

/** "9:08" as seconds. */
export function clockSeconds(clock: string): number {
  const [minutes = "0", seconds = "0"] = clock.split(":");
  const value = Number(minutes) * 60 + Number(seconds);
  return Number.isFinite(value) ? value : 0;
}

/** Seconds as a clock: 92 is "1:32". */
export function clockText(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const overtimeLength = (seasonType: number) => (seasonType === PLAYOFFS ? PERIOD : SHORT_OVERTIME);

function periodLength(period: number, seasonType: number): number {
  return period <= REGULATION_PERIODS ? PERIOD : overtimeLength(seasonType);
}

/** Seconds of the game played by `clock`. */
function gameSeconds({ period, elapsed }: GameClock, seasonType: number): number {
  const before =
    Math.min(period - 1, REGULATION_PERIODS) * PERIOD +
    Math.max(period - 1 - REGULATION_PERIODS, 0) * overtimeLength(seasonType);
  return before + Math.min(elapsed, periodLength(period, seasonType));
}

const isShootout = (period: number, seasonType: number) =>
  seasonType !== PLAYOFFS && period > REGULATION_PERIODS + 1;

/**
 * A reading of the clock a scoreboard shows, which counts down ("13:45" left in the period), as
 * time played.
 */
export function timePlayed(period: number, left: string, seasonType: number): GameClock {
  const length = periodLength(period, seasonType);
  return { period, elapsed: Math.max(0, length - clockSeconds(left)) };
}

function kindOf(play: Play): PenaltyKind | null {
  const minutes = play.penaltyMinutes;
  if (!play.penalty || minutes == null || play.teamId == null) return null;
  if (/game misconduct/i.test(`${play.typeText} ${play.type}`)) return null;
  if (minutes >= 10) return "misconduct";
  if (minutes === 5) return "major";
  if (minutes === 4) return "double-minor";
  return minutes === 2 ? "minor" : null;
}

/** A penalty being worked through the game. */
type Served = {
  play: Play;
  teamId: string;
  kind: PenaltyKind;
  /** Seconds, as given. */
  length: number;
  /** Game seconds when it was given. */
  given: number;
  /** The penalties given at the same stoppage, this one among them. */
  stoppage: Served[];
  shortHanded: boolean;
  coincidental: boolean;
  /** It starts when this one ends. */
  after: Served | null;
  /** Game seconds at which a goal ended it, or ended the first half of a double minor. */
  cut: number | null;
};

const timed = (served: Served) => served.kind !== "misconduct";
const penalized = (served: Served) => served.play.participants[0]?.athleteId ?? null;

function startOf(served: Served): number {
  if (served.kind === "misconduct") {
    // After whatever else the same player was given at the same stoppage.
    const player = penalized(served);
    const own = served.stoppage.filter(
      (other) => timed(other) && player != null && penalized(other) === player,
    );
    return Math.max(served.given, ...own.map(endOf));
  }
  return served.after == null ? served.given : Math.max(served.given, endOf(served.after));
}

function endOf(served: Served): number {
  return served.cut ?? startOf(served) + served.length;
}

/**
 * Being served at `at`. `forGoal` asks it of a goal scored then: the second a penalty ends
 * counts, which is when a goal ends it, and the second it is called does not.
 */
function running(served: Served, at: number, forGoal = false): boolean {
  const [start, end] = [startOf(served), endOf(served)];
  return forGoal ? start < at && at <= end : start <= at && at < end;
}

/**
 * The penalties of a game, each with how it is served: which are coincidental, which wait, and
 * which a goal cut short.
 */
function served(plays: readonly Play[], game: PenaltyGame): Served[] {
  const { seasonType } = game;
  const all: Served[] = [];
  const stoppages = new Map<string, Served[]>();
  const short = (teamId: string, at: number, forGoal = false) =>
    all.filter((one) => one.teamId === teamId && one.shortHanded && running(one, at, forGoal));

  for (const play of plays) {
    if (isShootout(play.period, seasonType) || play.periodText === SHOOTOUT) break;
    const at = gameSeconds({ period: play.period, elapsed: clockSeconds(play.clock) }, seasonType);
    const kind = kindOf(play);
    if (kind != null && play.teamId != null) {
      const key = `${play.period} ${play.clock}`;
      const stoppage = stoppages.get(key) ?? [];
      stoppages.set(key, stoppage);
      const one: Served = {
        play,
        teamId: play.teamId,
        kind,
        length: (play.penaltyMinutes ?? 0) * 60,
        given: at,
        stoppage,
        shortHanded: kind !== "misconduct",
        coincidental: false,
        after: null,
        cut: null,
      };
      stoppage.push(one);
      all.push(one);
      settle(stoppage, at, play.period, game, short);
    } else if (play.scoring && play.teamId != null) {
      const against = play.teamId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
      const theirs = short(against, at, true);
      if (theirs.length <= short(play.teamId, at, true).length) continue;
      // The minor with the least time left ends; of a double minor, the half being served.
      const ending = theirs
        .filter((one) => !one.coincidental && (one.kind === "minor" || one.kind === "double-minor"))
        .map((one) => ({ one, left: endOf(one) - at }))
        .map(({ one, left }) => ({ one, left, half: left > MINOR ? left - MINOR : left }))
        .sort((a, b) => a.half - b.half)[0];
      if (ending) ending.one.cut = ending.left > MINOR ? at + MINOR : at;
    }
  }
  return all;
}

/**
 * Works out how a stoppage's penalties are served, again each time one more of them is known:
 * ESPN lists them one play at a time.
 */
function settle(
  stoppage: Served[],
  at: number,
  period: number,
  game: PenaltyGame,
  short: (teamId: string, at: number) => Served[],
) {
  const sides = [game.homeTeamId, game.awayTeamId].map((teamId) =>
    stoppage.filter((one) => one.teamId === teamId && timed(one)),
  );
  const [home = [], away = []] = sides;
  for (const one of stoppage) {
    one.coincidental = false;
    one.shortHanded = timed(one);
    one.after = null;
  }
  // Pair off penalties of the same length, one from each team.
  for (const length of new Set(home.map((one) => one.length))) {
    const [ours, theirs] = [home, away].map((side) => side.filter((one) => one.length === length));
    const pairs = Math.min(ours?.length ?? 0, theirs?.length ?? 0);
    for (const one of [...(ours ?? []).slice(0, pairs), ...(theirs ?? []).slice(0, pairs)]) {
      one.coincidental = true;
      one.shortHanded = false;
    }
  }
  // One minor each at full strength is four on four. Overtime's three on three stays as it is.
  const earlier = (teamId: string) =>
    short(teamId, at).filter((one) => !stoppage.includes(one)).length;
  const overtime = period > REGULATION_PERIODS && game.seasonType !== PLAYOFFS;
  if (
    home.length === 1 &&
    away.length === 1 &&
    home[0]?.kind === "minor" &&
    away[0]?.kind === "minor" &&
    !overtime &&
    earlier(game.homeTeamId) === 0 &&
    earlier(game.awayTeamId) === 0
  ) {
    for (const one of [...home, ...away]) one.shortHanded = true;
  }
  // A player's second penalty follows his first, and a team's third waits for its first to end.
  for (const side of sides) {
    for (const [index, one] of side.entries()) {
      const player = penalized(one);
      const own = side
        .slice(0, index)
        .findLast((other) => player != null && penalized(other) === player);
      // Not behind a coincidental one: a teammate serves the one that leaves the team short.
      if (own && !(one.shortHanded && !own.shortHanded)) {
        one.after = own;
        continue;
      }
      if (!one.shortHanded) continue;
      const ahead = short(one.teamId, at).filter((other) => other !== one && startOf(other) <= at);
      if (ahead.length < MOST_SHORT) continue;
      const waitedFor = new Set(side.map((other) => other.after));
      one.after =
        ahead.filter((other) => !waitedFor.has(other)).sort((a, b) => endOf(a) - endOf(b))[0] ??
        null;
    }
  }
}

function skatersAt(down: Skaters, overtime: boolean): Skaters {
  const home = Math.min(down.home, MOST_SHORT);
  const away = Math.min(down.away, MOST_SHORT);
  if (!overtime) return { home: FULL_STRENGTH - home, away: FULL_STRENGTH - away };
  return {
    home: OVERTIME_STRENGTH + Math.max(0, away - home),
    away: OVERTIME_STRENGTH + Math.max(0, home - away),
  };
}

const nobody = (period: number): PenaltyState => ({
  box: [],
  skaters: { home: FULL_STRENGTH, away: FULL_STRENGTH },
  advantage: null,
  period,
});

/** A game that is over, or not begun. */
export const NO_PENALTIES = nobody(1);

/**
 * Who is in the box and who has the advantage once `plays` have happened.
 *
 * The moment is the last play's own: a Replay hands the plays up to its playhead. `clock` is a
 * later reading of the game clock, where there is one (a live game's header between plays); an
 * earlier one is ignored, since the plays have already happened.
 */
export function penaltyState(
  plays: readonly Play[],
  game: PenaltyGame,
  clock: GameClock | null = null,
): PenaltyState {
  const last = plays.at(-1);
  if (last == null) return NO_PENALTIES;
  const { seasonType } = game;
  const lastAt = { period: last.period, elapsed: clockSeconds(last.clock) };
  const now =
    clock != null && gameSeconds(clock, seasonType) > gameSeconds(lastAt, seasonType)
      ? clock
      : lastAt;
  // Overtime outside the playoffs ends in a shootout, so a penalty running at its end is over.
  const overtimeOver =
    seasonType !== PLAYOFFS &&
    now.period === REGULATION_PERIODS + 1 &&
    now.elapsed >= SHORT_OVERTIME;
  if (
    overtimeOver ||
    isShootout(now.period, seasonType) ||
    last.periodText === SHOOTOUT ||
    plays.some((play) => play.type === "end-of-game")
  ) {
    return nobody(now.period);
  }

  const at = gameSeconds(now, seasonType);
  const inBox = served(plays, game).filter((one) => at < endOf(one));
  const down = (teamId: string) =>
    inBox.filter((one) => one.teamId === teamId && one.shortHanded && running(one, at));
  const [homeDown, awayDown] = [down(game.homeTeamId), down(game.awayTeamId)];
  const overtime = now.period > REGULATION_PERIODS && seasonType !== PLAYOFFS;
  const skaters = skatersAt({ home: homeDown.length, away: awayDown.length }, overtime);

  const ahead =
    skaters.home === skaters.away
      ? null
      : skaters.home > skaters.away
        ? { teamId: game.homeTeamId, given: awayDown }
        : { teamId: game.awayTeamId, given: homeDown };
  return {
    box: inBox.map((one) => {
      const waiting = startOf(one) > at;
      return {
        playId: one.play.id,
        teamId: one.teamId,
        player: one.play.participants[0]?.shortName ?? null,
        infraction: one.play.typeText,
        minutes: one.length / 60,
        kind: one.kind,
        remaining: endOf(one) - Math.max(at, startOf(one)),
        waiting,
        shortHanded: one.shortHanded,
      };
    }),
    skaters,
    period: now.period,
    advantage: ahead && {
      teamId: ahead.teamId,
      remaining: Math.min(...ahead.given.map((one) => endOf(one) - at)),
    },
  };
}

/** "5 on 4": the skaters a side, the larger number first. */
export function strengthLine({ home, away }: Skaters): string {
  return `${Math.max(home, away)} on ${Math.min(home, away)}`;
}
