import { z } from "zod";
import { TeamSchema } from "./team.ts";

/**
 * Where a game stands.
 *
 * - `scheduled`: not started. Its page shows the matchup and the pick.
 * - `live`: under way, intermissions included. Its page shows the Game Stream.
 * - `final`: played to a result. Its page shows the Replay.
 * - `postponed`: over without a result (postponed, cancelled or suspended). Never recorded as a
 *   finished game.
 */
export const GameStatusSchema = z.enum(["scheduled", "live", "final", "postponed"]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

/** One team's side of a game: the team, with its score. */
export const GameSideSchema = TeamSchema.extend({
  /** 0 until the game starts. */
  score: z.number().int().nonnegative(),
  /** True only for the winner of a `final` game. */
  winner: z.boolean(),
  /** The team's win-loss-overtime record, such as "1-0-1", where ESPN sends one. */
  record: z.string().nullable(),
});
export type GameSide = z.infer<typeof GameSideSchema>;

/**
 * One NHL game, as shown in a game row, a ticker, a schedule or the Scoreboard's state. Every
 * place that lists games uses this one shape. It names its fields as `FinalGame` does, so a
 * `final` game parses straight into one: `FinalGameSchema.parse(game)`.
 */
export const GameSchema = z.object({
  /** ESPN's event id. It is the `:id` in `/nhl/games/:id` and the name of the game's Agent. */
  id: z.string().min(1),
  /** The scheduled start, in UTC. */
  startTime: z.iso.datetime(),
  /** ESPN's season year: 2027 is the 2026-27 season. */
  season: z.number().int(),
  /** ESPN's season type: 1 preseason, 2 regular season, 3 playoffs. */
  seasonType: z.number().int(),
  status: GameStatusSchema,
  /** 0 before the start; 1 to 3 in regulation; 4 and up for overtime and the shootout. */
  period: z.number().int().nonnegative(),
  /** Time left in the period, such as "12:34". "0:00" when the game is not `live`. */
  clock: z.string(),
  /** ESPN's short wording of the status, such as "Final/OT". Display text only. */
  detail: z.string(),
  home: GameSideSchema,
  away: GameSideSchema,
  /** The arena's name. */
  venue: z.string().nullable(),
  /** Where it is shown, such as "ESPN+". */
  broadcasts: z.array(z.string()),
});
export type Game = z.infer<typeof GameSchema>;

/** One day's slate of games. */
export const ScoreboardSchema = z.object({
  /** The slate's date as the NHL counts it (Eastern time), `YYYY-MM-DD`. */
  date: z.iso.date(),
  games: z.array(GameSchema),
});
export type Scoreboard = z.infer<typeof ScoreboardSchema>;
