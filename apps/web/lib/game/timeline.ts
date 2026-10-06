import type { Game, Play } from "@yogan-hockey/schemas";

const REGULATION_PERIODS = 3;
const PERIOD_MINUTES = 20;
/** Overtime outside the playoffs is five minutes of three-on-three, then a shootout. */
const SHORT_OVERTIME_MINUTES = 5;
/** A shootout has no clock. It gets the room of this many minutes, and its plays go in order. */
const SHOOTOUT_ROOM = 8;
/** A shootout's plays are spaced as if it had at least this many, so early ones do not move. */
const SHOOTOUT_SLOTS = 16;
const PLAYOFFS = 3;
export const SHOOTOUT = "SO";

/** How a period is named: "1st", "OT", "SO", and "2OT" in the playoffs. */
export function periodLabel(period: number, seasonType: number): string {
  if (period <= REGULATION_PERIODS) return ["1st", "2nd", "3rd"][period - 1] ?? "";
  const overtime = period - REGULATION_PERIODS;
  if (overtime === 1) return "OT";
  return seasonType === PLAYOFFS ? `${overtime}OT` : SHOOTOUT;
}

/** One period's stretch of the timeline. `start` and `width` are fractions of its length. */
export type TimelinePeriod = { period: number; label: string; start: number; width: number };

export type Timeline = {
  periods: TimelinePeriod[];
  /** Each play's place along the timeline, from 0 to 1, by play id. */
  positions: Map<string, number>;
};

function clockMinutes(clock: string): number {
  const [minutes = "0", seconds = "0"] = clock.split(":");
  const value = Number(minutes) + Number(seconds) / 60;
  return Number.isFinite(value) ? value : 0;
}

/**
 * Lays a game out along a line: the three periods always, overtime and a shootout once the game
 * reaches them. A period is as wide as it is long, so regular-season overtime is a quarter of a
 * period and playoff overtime a whole one. A play sits where its clock puts it; a play's clock
 * counts up from the start of its period.
 */
export function layoutTimeline(
  plays: readonly Play[],
  game: Pick<Game, "period" | "seasonType">,
): Timeline {
  const labels = new Map<number, string>();
  for (const play of plays) labels.set(play.period, play.periodText);
  const last = Math.max(REGULATION_PERIODS, game.period, ...labels.keys());

  const parts = Array.from({ length: last }, (_, index) => {
    const period = index + 1;
    const label = labels.get(period) || periodLabel(period, game.seasonType);
    const overtimeMinutes = game.seasonType === PLAYOFFS ? PERIOD_MINUTES : SHORT_OVERTIME_MINUTES;
    const minutes = period <= REGULATION_PERIODS ? PERIOD_MINUTES : overtimeMinutes;
    return { period, label, minutes, room: label === SHOOTOUT ? SHOOTOUT_ROOM : minutes };
  });
  const total = parts.reduce((sum, part) => sum + part.room, 0);

  let elapsed = 0;
  const periods = parts.map((part) => {
    const start = elapsed / total;
    elapsed += part.room;
    return { ...part, start, width: part.room / total };
  });

  const shootoutPlays = plays.filter((play) => play.periodText === SHOOTOUT);
  const slots = Math.max(SHOOTOUT_SLOTS, shootoutPlays.length);
  const positions = new Map<string, number>();
  for (const play of plays) {
    const period = periods[play.period - 1];
    if (period == null) continue;
    const through =
      period.label === SHOOTOUT
        ? (shootoutPlays.indexOf(play) + 0.5) / slots
        : Math.min(clockMinutes(play.clock) / period.minutes, 1);
    positions.set(play.id, period.start + through * period.width);
  }

  return {
    periods: periods.map(({ period, label, start, width }) => ({ period, label, start, width })),
    positions,
  };
}
