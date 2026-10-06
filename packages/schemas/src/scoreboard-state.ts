import { z } from "zod";
import { GameSchema, GameSideSchema } from "./game.ts";

/** One team's side of a game on the Scoreboard: enough to draw a ticker entry or a game row. */
export const ScoreboardSideSchema = GameSideSchema.pick({
  id: true,
  abbreviation: true,
  logo: true,
  logoDark: true,
  score: true,
  winner: true,
  record: true,
});
export type ScoreboardSide = z.infer<typeof ScoreboardSideSchema>;

/**
 * One game as the Scoreboard Agent pushes it to every open page. It is a `Game` with what the
 * ticker and the game rows do not draw left out (the season, and of each team its names, location
 * and colours), because the whole state is sent again on every change. The logos are carried
 * though nothing draws them: a team's mark is the site's own file, found by the team's id (#97).
 */
export const ScoreboardGameSchema = GameSchema.pick({
  id: true,
  startTime: true,
  seasonType: true,
  status: true,
  period: true,
  clock: true,
  detail: true,
  venue: true,
}).extend({
  home: ScoreboardSideSchema,
  away: ScoreboardSideSchema,
  /** Who shows the game ("ESPN+", "TNT"). Absent from state stored before the field existed. */
  broadcasts: GameSchema.shape.broadcasts.optional(),
});
export type ScoreboardGame = z.infer<typeof ScoreboardGameSchema>;

/** The Scoreboard Agent's synced state: today's games. */
export const ScoreboardStateSchema = z.object({
  /** The slate's date as the NHL counts it (Eastern time). Null until the first poll. */
  date: z.iso.date().nullable(),
  games: z.array(ScoreboardGameSchema),
  /**
   * When a poll last found something different, in UTC. Null until the first poll. A page shows
   * `heardAt` instead (`ScoreboardReading`), which also moves on a poll that found nothing new.
   */
  updatedAt: z.iso.datetime().nullable(),
  /**
   * When the Scoreboard last invalidated cached data because of a finished game, in UTC: at a
   * final, five minutes after it, and after a catch-up. An open page that sees this change
   * re-renders (`useRefreshOnInvalidation`). Null until it first happens; absent from state
   * stored before the field existed.
   */
  invalidatedAt: z.iso.datetime().nullable().optional(),
});
export type ScoreboardState = z.infer<typeof ScoreboardStateSchema>;

/**
 * What an open page receives after a poll that reached ESPN and found nothing new, in place of
 * the whole state again: only the time, in UTC. It is sent on the Scoreboard's socket beside the
 * state.
 */
export type ScoreboardHeard = { type: "scoreboard_heard"; at: string };

/**
 * The Scoreboard as a page reads it: the synced state, and when the Scoreboard last heard from
 * ESPN, in UTC, whether or not anything had changed. Null until the first good poll.
 */
export type ScoreboardReading = ScoreboardState & { heardAt: string | null };
