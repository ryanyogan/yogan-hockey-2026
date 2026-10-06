import type { Play } from "@yogan-hockey/schemas";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** One row per finished game. */
export const games = sqliteTable(
  "games",
  {
    /** ESPN's event id. */
    id: text("id").primaryKey(),
    /** The day the game is listed under: YYYY-MM-DD in US Eastern time, as on ESPN's scoreboard. */
    date: text("date").notNull(),
    /** The scheduled start, an ISO 8601 UTC instant. */
    startTime: text("start_time").notNull(),
    /** ESPN's season year: 2027 is the 2026-27 season. */
    season: integer("season").notNull(),
    /** ESPN's season type: 1 preseason, 2 regular season, 3 playoffs. */
    seasonType: integer("season_type").notNull(),
    homeTeamId: text("home_team_id").notNull(),
    homeTeamAbbreviation: text("home_team_abbreviation").notNull(),
    homeTeamName: text("home_team_name").notNull(),
    homeScore: integer("home_score").notNull(),
    awayTeamId: text("away_team_id").notNull(),
    awayTeamAbbreviation: text("away_team_abbreviation").notNull(),
    awayTeamName: text("away_team_name").notNull(),
    awayScore: integer("away_score").notNull(),
  },
  (table) => [index("games_date_idx").on(table.date)],
);

/** What a play row keeps that nothing queries by: every field of a play without a column. */
export type PlayDetail = Omit<
  Play,
  "id" | "type" | "period" | "clock" | "text" | "teamId" | "coordinate" | "scoring" | "penalty"
>;

/** One row per play of a finished game. */
export const plays = sqliteTable(
  "plays",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    /** ESPN's play id. */
    id: text("id").notNull(),
    /** The play's place in ESPN's list, from 0. This is the order of the game. */
    position: integer("position").notNull(),
    type: text("type").notNull(),
    period: integer("period").notNull(),
    clock: text("clock").notNull(),
    text: text("text").notNull(),
    teamId: text("team_id"),
    /** Feet from centre ice, where ESPN gives a coordinate. */
    x: real("x"),
    y: real("y"),
    scoring: integer("scoring", { mode: "boolean" }).notNull(),
    penalty: integer("penalty", { mode: "boolean" }).notNull(),
    detail: text("detail", { mode: "json" }).$type<PlayDetail>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.id] }),
    uniqueIndex("plays_game_position_idx").on(table.gameId, table.position),
  ],
);

/**
 * One row per game: its Prediction, or the record that making one failed.
 * The game id is the key, so a second Prediction for a game is impossible.
 * It does not reference `games`: a Prediction is made before its game is played.
 */
export const predictions = sqliteTable(
  "predictions",
  {
    /** ESPN's event id. */
    gameId: text("game_id").primaryKey(),
    status: text("status", { enum: ["made", "failed"] }).notNull(),
    /** ESPN's id for the team picked to win. Null on a failed row, like the three after it. */
    pickTeamId: text("pick_team_id"),
    /** The picked team's chance of winning, as a percentage. */
    winProbability: real("win_probability"),
    reasoning: text("reasoning"),
    keyFactors: text("key_factors", { mode: "json" }).$type<string[]>(),
    /** An ISO 8601 UTC instant. */
    madeAt: text("made_at").notNull(),
    model: text("model").notNull(),
    /** A compact copy of what the model was given. */
    inputs: text("inputs", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    check("predictions_status_check", sql`${table.status} in ('made', 'failed')`),
    check(
      "predictions_made_has_pick_check",
      sql`${table.status} = 'failed' or (${table.pickTeamId} is not null and ${table.winProbability} is not null and ${table.reasoning} is not null and ${table.keyFactors} is not null)`,
    ),
  ],
);

/**
 * Walking-skeleton table (#31): one row per bump of the stub Agent. It goes when the
 * skeleton page does, by a migration that drops it.
 */
export const skeletonBumps = sqliteTable("skeleton_bumps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  count: integer("count").notNull(),
  bumpedAt: text("bumped_at").notNull(),
});
