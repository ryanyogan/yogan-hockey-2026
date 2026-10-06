import { z } from "zod";

/** An NHL team, as it appears wherever a team is named: a game, a standings row, the team list. */
export const TeamSchema = z.object({
  /** ESPN's team id. It is the `:id` in `/nhl/teams/:id` and in the `team:{id}` cache tag. */
  id: z.string().min(1),
  /** "TOR" */
  abbreviation: z.string().min(1),
  /** "Toronto Maple Leafs" */
  name: z.string().min(1),
  /** "Maple Leafs" */
  shortName: z.string().min(1),
  /** "Toronto" */
  location: z.string().min(1),
  /** Six hex digits without the `#`. ESPN sends it with some responses and not others. */
  color: z.string().nullable(),
  logo: z.url().nullable(),
  /** The logo drawn for dark backgrounds, where ESPN sends one. */
  logoDark: z.url().nullable(),
});
export type Team = z.infer<typeof TeamSchema>;

/** A team's season so far. Shared by a standings row and a team's stats. */
export const TeamRecordSchema = z.object({
  gamesPlayed: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  otLosses: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  goalDifferential: z.number().int(),
});
export type TeamRecord = z.infer<typeof TeamRecordSchema>;

/** The Stats tab of a team page. */
export const TeamStatsSchema = TeamRecordSchema.extend({
  /** Percentages, 0 to 100. Null until ESPN has them, early in a season. */
  powerPlayPct: z.number().nullable(),
  penaltyKillPct: z.number().nullable(),
});
export type TeamStats = z.infer<typeof TeamStatsSchema>;

/** One player on a team's roster. */
export const RosterPlayerSchema = z.object({
  /** ESPN's athlete id: the `:id` in `/players/:id` and in the `player:{id}` cache tag. */
  id: z.string().min(1),
  name: z.string().min(1),
  /** A string because "00" is not 0. Null for a player not yet given a number. */
  jersey: z.string().nullable(),
  /** "C", "LW", "RW", "D" or "G". */
  position: z.string().min(1),
  headshot: z.url().nullable(),
});
export type RosterPlayer = z.infer<typeof RosterPlayerSchema>;
