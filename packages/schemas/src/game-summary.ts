import { z } from "zod";
import { GameSchema, GameSideSchema, GameStatusSchema } from "./game.ts";
import { PlaySchema } from "./play.ts";
import { TeamSchema } from "./team.ts";

/** A team named in passing: an opponent, a player's club. */
export const TeamRefSchema = TeamSchema.pick({ id: true, abbreviation: true, name: true });
export type TeamRef = z.infer<typeof TeamRefSchema>;

/** One side of a game header: the side of any game, with its shots on goal. */
export const GameHeaderSideSchema = GameSideSchema.extend({
  /** Shots on goal so far. 0 until the game starts. */
  shots: z.number().int().nonnegative(),
});
export type GameHeaderSide = z.infer<typeof GameHeaderSideSchema>;

/**
 * The header of a game page and the Game Agent's synced state: a `Game` with each side's shots.
 * Its score is ESPN's own, never worked out from the plays, whose running score can lag it.
 */
export const GameHeaderSchema = GameSchema.extend({
  home: GameHeaderSideSchema,
  away: GameHeaderSideSchema,
});
export type GameHeader = z.infer<typeof GameHeaderSchema>;

/** A game a team has already played, seen from that team's side. */
export const RecentGameSchema = z.object({
  /** ESPN's event id. */
  gameId: z.string().min(1),
  startTime: z.iso.datetime(),
  /** Whether the team was at home. */
  home: z.boolean(),
  opponent: TeamRefSchema,
  /** "W" or "L", as ESPN words it. */
  result: z.string(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
});
export type RecentGame = z.infer<typeof RecentGameSchema>;

/** Where a team sits in its division when the summary is read: today, even for an old game. */
export const PregameStandingSchema = z.object({
  /** 1 is first in the division. */
  position: z.number().int().positive(),
  /** "Atlantic Division" */
  division: z.string().min(1),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  otLosses: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
});
export type PregameStanding = z.infer<typeof PregameStandingSchema>;

/** A goalie a team may start, with his season so far. A stat is null until ESPN has it. */
export const PregameGoalieSchema = z.object({
  athleteId: z.string().min(1),
  name: z.string().min(1),
  gamesPlayed: z.number().nullable(),
  wins: z.number().nullable(),
  losses: z.number().nullable(),
  otLosses: z.number().nullable(),
  goalsAgainstAverage: z.number().nullable(),
  /** A fraction: 0.914. */
  savePct: z.number().nullable(),
  shutouts: z.number().nullable(),
});
export type PregameGoalie = z.infer<typeof PregameGoalieSchema>;

/** A player out of, or doubtful for, a game. */
export const PregameInjurySchema = z.object({
  athleteId: z.string().min(1),
  name: z.string().min(1),
  /** "C", "LW", "RW", "D" or "G". */
  position: z.string().nullable(),
  /** "Injured Reserve", "Day-To-Day", "Out". */
  status: z.string().min(1),
  /** The body part or reason: "Abdomen". */
  type: z.string().nullable(),
  /** "Surgery" */
  detail: z.string().nullable(),
  /** The expected return, `YYYY-MM-DD`. */
  returnDate: z.iso.date().nullable(),
});
export type PregameInjury = z.infer<typeof PregameInjurySchema>;

/** A team's leader in one stat. */
export const PregameLeaderSchema = z.object({
  /** "goals", "assists" or "points". */
  category: z.string().min(1),
  athleteId: z.string().min(1),
  name: z.string().min(1),
  position: z.string().nullable(),
  value: z.number(),
});
export type PregameLeader = z.infer<typeof PregameLeaderSchema>;

/** One team going into a game. The key it sits under, `home` or `away`, says which it is. */
export const PregameSideSchema = z.object({
  teamId: z.string().min(1),
  /** Win-loss-overtime summaries such as "1-2-0": the overall record and the split that applies. */
  record: z.object({
    overall: z.string().nullable(),
    home: z.string().nullable(),
    road: z.string().nullable(),
  }),
  standing: PregameStandingSchema.nullable(),
  /** Up to five games, oldest first. Early in a season they include the preseason. */
  lastFive: z.array(RecentGameSchema),
  goalies: z.array(PregameGoalieSchema),
  injuries: z.array(PregameInjurySchema),
  leaders: z.array(PregameLeaderSchema),
});
export type PregameSide = z.infer<typeof PregameSideSchema>;

const SeasonSeriesSideSchema = z.object({
  teamId: z.string().min(1),
  abbreviation: z.string().min(1),
  score: z.number().int().nonnegative(),
});

/** The games two teams play each other in a season, this one included. */
export const SeasonSeriesSchema = z.object({
  /** ESPN's wording: "Series tied 1-1", "Series starts 10/6". */
  summary: z.string(),
  games: z.array(
    z.object({
      gameId: z.string().min(1),
      startTime: z.iso.datetime(),
      status: GameStatusSchema,
      home: SeasonSeriesSideSchema,
      away: SeasonSeriesSideSchema,
    }),
  ),
});
export type SeasonSeries = z.infer<typeof SeasonSeriesSchema>;

/**
 * What a Prediction is made from: each team's record, standing, last five games, goalies,
 * injuries and leaders, and the season series. Betting lines are no part of it.
 */
export const PregameSchema = z.object({
  home: PregameSideSchema,
  away: PregameSideSchema,
  seasonSeries: SeasonSeriesSchema.nullable(),
});
export type Pregame = z.infer<typeof PregameSchema>;

/** ESPN's whole-game snapshot, as the Game Agent, the Replay and a Prediction read it. */
export const GameSummarySchema = z.object({
  header: GameHeaderSchema,
  /** Every play so far, in ESPN's order. Empty before the game starts. */
  plays: z.array(PlaySchema),
  /**
   * Filled for a scheduled game. ESPN drops the goalies and the last five games once it starts,
   * and a finished game's standings, injuries and leaders are today's, not that night's.
   */
  pregame: PregameSchema,
});
export type GameSummary = z.infer<typeof GameSummarySchema>;
