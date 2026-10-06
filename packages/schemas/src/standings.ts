import { z } from "zod";
import { TeamRecordSchema, TeamSchema } from "./team.ts";

/** A conference or a division. */
export const StandingsGroupingSchema = z.object({
  /** "Eastern Conference", "Atlantic Division" */
  name: z.string().min(1),
  /** "East", "ATL" */
  abbreviation: z.string().min(1),
});

/** One team's line in the standings. */
export const StandingsRowSchema = TeamRecordSchema.extend({
  team: TeamSchema,
  conference: StandingsGroupingSchema,
  division: StandingsGroupingSchema,
  /** Wins in regulation, and in regulation or overtime: the first two tiebreakers. */
  regulationWins: z.number().int().nonnegative(),
  regulationPlusOvertimeWins: z.number().int().nonnegative(),
  /** "W2", "L1", "OT1" */
  streak: z.string(),
  /** Win-loss-overtime summaries such as "2-0-0". */
  homeRecord: z.string(),
  roadRecord: z.string(),
  lastTen: z.string(),
});
export type StandingsRow = z.infer<typeof StandingsRowSchema>;

/**
 * The league's standings: one row per team, in ESPN's order of conference then division. Build
 * a view with `standingsView`, which does the ranking.
 */
export const StandingsSchema = z.object({
  /** "2026-27" */
  season: z.string().min(1),
  rows: z.array(StandingsRowSchema),
});
export type Standings = z.infer<typeof StandingsSchema>;
