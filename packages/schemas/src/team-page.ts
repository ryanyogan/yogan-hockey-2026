import { z } from "zod";
import { GameSchema } from "./game.ts";
import { RosterPlayerSchema, TeamSchema, TeamStatsSchema } from "./team.ts";

/** A team page's header, Roster tab and Stats tab: everything but the schedule. */
export const TeamDetailSchema = z.object({
  team: TeamSchema,
  /** Win-loss-overtime summaries such as "1-2-0". Null before the season has a record. */
  record: z.object({
    overall: z.string().nullable(),
    home: z.string().nullable(),
    road: z.string().nullable(),
  }),
  /** "6th in Atlantic Division" */
  standingSummary: z.string().nullable(),
  stats: TeamStatsSchema.nullable(),
  roster: z.array(RosterPlayerSchema),
  /** The game ESPN lists as the team's next: usually `scheduled`, `live` while it is being played. */
  nextGame: GameSchema.nullable(),
});
export type TeamDetail = z.infer<typeof TeamDetailSchema>;

/** A team's regular-season games for the current season, in date order. */
export const TeamScheduleSchema = z.object({
  teamId: z.string().min(1),
  /** "2026-27" */
  season: z.string().min(1),
  games: z.array(GameSchema),
});
export type TeamSchedule = z.infer<typeof TeamScheduleSchema>;
