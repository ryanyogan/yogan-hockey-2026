import { z } from "zod";

/** One side of a finished game, as the permanent record keeps it. */
export const FinalGameTeamSchema = z.object({
  /** ESPN's team id. */
  id: z.string().min(1),
  abbreviation: z.string().min(1),
  name: z.string().min(1),
  /** The final score. A shootout winner's score already includes the deciding goal. */
  score: z.number().int().nonnegative(),
});
export type FinalGameTeam = z.infer<typeof FinalGameTeamSchema>;

/** A finished NHL game: what the Scoreboard and Game Agents write to D1 at the final. */
export const FinalGameSchema = z.object({
  /** ESPN's event id. */
  id: z.string().min(1),
  /** The scheduled start, as a UTC instant. */
  startTime: z.iso.datetime(),
  /** ESPN's season year: 2027 is the 2026-27 season. */
  season: z.number().int(),
  /** ESPN's season type: 1 preseason, 2 regular season, 3 playoffs. */
  seasonType: z.number().int(),
  home: FinalGameTeamSchema,
  away: FinalGameTeamSchema,
});
export type FinalGame = z.infer<typeof FinalGameSchema>;
