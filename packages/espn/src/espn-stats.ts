import type { TeamRecord } from "@yogan-hockey/schemas";
import { z } from "zod";

/** A stat read as its number, such as `points`. */
export const statValue = z.object({ value: z.number() }).transform((stat) => stat.value);

/** A stat read as its wording, such as a streak of "W2" or a home record of "2-0-0". */
export const statText = z
  .object({ displayValue: z.string() })
  .transform((stat) => stat.displayValue);

const EspnStatList = z.array(z.looseObject({ name: z.string() }));

/**
 * ESPN sends stats as a list of `{ name, value, displayValue }`. This reads the named ones out of
 * the list, so a stat that goes missing is a parse error that says which.
 */
export function espnStats<Shape extends z.ZodRawShape>(shape: Shape) {
  return z.preprocess((stats) => {
    const list = EspnStatList.safeParse(stats);
    // Anything that is not a stat list is left for the object below to reject.
    return list.success ? Object.fromEntries(list.data.map((stat) => [stat.name, stat])) : stats;
  }, z.object(shape));
}

/**
 * The stats behind a team's record, in a standings entry and in team detail alike. ESPN counts
 * goals as "points for" and "points against", as it does in every sport.
 */
export const recordStats = {
  gamesPlayed: statValue,
  wins: statValue,
  losses: statValue,
  otLosses: statValue,
  points: statValue,
  pointsFor: statValue,
  pointsAgainst: statValue,
  pointDifferential: statValue,
};

export function teamRecordFrom(stats: z.output<z.ZodObject<typeof recordStats>>): TeamRecord {
  return {
    gamesPlayed: stats.gamesPlayed,
    wins: stats.wins,
    losses: stats.losses,
    otLosses: stats.otLosses,
    points: stats.points,
    goalsFor: stats.pointsFor,
    goalsAgainst: stats.pointsAgainst,
    goalDifferential: stats.pointDifferential,
  };
}

/** "1-2-0, 2 PTS" without the points: ESPN appends them to some records and not others. */
export function recordOnly(text: string): string {
  return text.split(",")[0] ?? text;
}
