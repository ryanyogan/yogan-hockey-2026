import { z } from "zod";
import { RecentGameSchema, TeamRefSchema } from "./game-summary.ts";
import { TeamSchema } from "./team.ts";

/** One column of a stat table. A skater's columns are not a goalie's, so a table carries its own. */
export const StatColumnSchema = z.object({
  /** ESPN's name for the stat: "goals", "savePct". */
  name: z.string().min(1),
  /** The column heading: "G", "SV%". */
  label: z.string().min(1),
});
export type StatColumn = z.infer<typeof StatColumnSchema>;

/** One headline stat of a player's season, with where it ranks in the league. */
export const SeasonStatSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  /** As shown: "41", ".914", "1-0-0". */
  value: z.string(),
  /** "Tied-47th" */
  rank: z.string().nullable(),
});
export type SeasonStat = z.infer<typeof SeasonStatSchema>;

/** A player page's header and season summary. */
export const PlayerProfileSchema = z.object({
  /** ESPN's athlete id: the `:id` in `/players/:id` and in the `player:{id}` cache tag. */
  id: z.string().min(1),
  name: z.string().min(1),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  jersey: z.string().nullable(),
  /** "C", "LW", "RW", "D" or "G". */
  position: z.string().min(1),
  /** "Center" */
  positionName: z.string().nullable(),
  headshot: z.url().nullable(),
  /** Null for a player without a club. */
  team: TeamSchema.nullable(),
  /** `6' 3"` */
  height: z.string().nullable(),
  /** "214 lbs" */
  weight: z.string().nullable(),
  birthDate: z.iso.date().nullable(),
  age: z.number().int().nullable(),
  birthPlace: z.string().nullable(),
  /** "2016: Rd 1, Pk 1 (TOR)" */
  draft: z.string().nullable(),
  /** "11th Season" */
  experience: z.string().nullable(),
  /** The hand he shoots or catches with: "Left". */
  hand: z.string().nullable(),
  active: z.boolean(),
  /** The current season's headline stats. Null when ESPN has none for him. */
  seasonSummary: z
    .object({
      /** "2026-27 regular season stats" */
      title: z.string(),
      stats: z.array(SeasonStatSchema),
    })
    .nullable(),
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

/** The career table of a player page: one row per season and club, oldest first. */
export const PlayerCareerSchema = z.object({
  playerId: z.string().min(1),
  columns: z.array(StatColumnSchema),
  seasons: z.array(
    z.object({
      /** ESPN's season year: 2027 is the 2026-27 season. */
      year: z.number().int(),
      /** "26-27" */
      season: z.string().min(1),
      /** Null on the row that totals a season split between clubs, which follows those clubs' rows. */
      team: TeamRefSchema.nullable(),
      /** One value per column, as shown. */
      values: z.array(z.string()),
    }),
  ),
  /** The career totals, one per column. Empty when ESPN sends none. */
  totals: z.array(z.string()),
});
export type PlayerCareer = z.infer<typeof PlayerCareerSchema>;

/** A player's games this season, newest first, each with his line in it. */
export const PlayerGameLogSchema = z.object({
  playerId: z.string().min(1),
  columns: z.array(StatColumnSchema),
  games: z.array(
    RecentGameSchema.extend({
      /** One value per column, as shown. */
      values: z.array(z.string()),
    }),
  ),
});
export type PlayerGameLog = z.infer<typeof PlayerGameLogSchema>;

/** One player found by a search. */
export const PlayerSearchResultSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  jersey: z.string().nullable(),
  position: z.string().nullable(),
  headshot: z.url().nullable(),
  team: TeamRefSchema.nullable(),
});
export type PlayerSearchResult = z.infer<typeof PlayerSearchResultSchema>;

/** A search never shows more than this many players. */
export const PLAYER_SEARCH_LIMIT = 10;
