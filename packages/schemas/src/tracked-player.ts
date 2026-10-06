import { z } from "zod";
import { StatColumnSchema } from "./player.ts";

/*
 * A Tracked Player: a family member whose season the site follows outside the NHL. The site reads
 * one from a static file and from nowhere else, so everything here is what somebody typed. Every
 * object is strict: a field this shape does not name fails the parse, and so cannot reach a page
 * without having been thought about (ADR 0005).
 */

/** Rows of figures under shared columns: every row must have one figure per column. */
function figuresMatchColumns(
  columns: readonly unknown[],
  rows: readonly { values: readonly string[]; path: (string | number)[] }[],
  ctx: z.RefinementCtx,
) {
  for (const row of rows) {
    if (row.values.length !== columns.length) {
      ctx.addIssue({
        code: "custom",
        path: row.path,
        message: `expected ${columns.length} values, one per column, and found ${row.values.length}`,
      });
    }
  }
}

/** What the header line says about him. There is no birth date, birthplace or photo to give. */
export const TrackedProfileSchema = z.strictObject({
  jersey: z.string().min(1).optional(),
  /** "C", "LW", "RW", "D" or "G". */
  position: z.string().min(1).optional(),
  /** "Center" */
  positionName: z.string().min(1).optional(),
  /** The hand he shoots or catches with: "Right". */
  hand: z.string().min(1).optional(),
});
export type TrackedProfile = z.infer<typeof TrackedProfileSchema>;

/** His club: a name and nothing that places him within it. */
export const TrackedTeamSchema = z.strictObject({ name: z.string().min(1) });
export type TrackedTeam = z.infer<typeof TrackedTeamSchema>;

/** The season in progress, as one line of figures. */
export const TrackedSeasonSchema = z
  .strictObject({
    /** "2026-27" */
    season: z.string().min(1),
    columns: z.array(StatColumnSchema).min(1),
    /** One value per column, as shown. */
    values: z.array(z.string()),
  })
  .superRefine((season, ctx) => {
    figuresMatchColumns(season.columns, [{ values: season.values, path: ["values"] }], ctx);
  });
export type TrackedSeason = z.infer<typeof TrackedSeasonSchema>;

/** The career table: one row per season, oldest first, and the totals. */
export const TrackedCareerSchema = z
  .strictObject({
    columns: z.array(StatColumnSchema).min(1),
    seasons: z.array(
      z.strictObject({
        /** "2025-26" */
        season: z.string().min(1),
        /** The club's name, as shown. */
        team: z.string().min(1),
        values: z.array(z.string()),
      }),
    ),
    /** One per column. */
    totals: z.array(z.string()),
  })
  .superRefine((career, ctx) => {
    figuresMatchColumns(
      career.columns,
      [
        ...career.seasons.map((season, index) => ({
          values: season.values,
          path: ["seasons", index, "values"],
        })),
        { values: career.totals, path: ["totals"] },
      ],
      ctx,
    );
  });
export type TrackedCareer = z.infer<typeof TrackedCareerSchema>;

/** One game of the log. `played` is null until it has been played. */
export const TrackedGameSchema = z.strictObject({
  date: z.iso.date(),
  /** The opponent's name, as shown. */
  opponent: z.string().min(1),
  home: z.boolean(),
  played: z
    .strictObject({
      /** "W", "L" or "OTL". */
      result: z.string().min(1),
      goalsFor: z.number().int().nonnegative(),
      goalsAgainst: z.number().int().nonnegative(),
      /** His line in the game: one value per column of the log. */
      values: z.array(z.string()),
    })
    .nullable(),
});
export type TrackedGame = z.infer<typeof TrackedGameSchema>;

/** A season's games, in any order: those played, each with his line, and those to come. */
export const TrackedGameLogSchema = z
  .strictObject({
    /** "2026-27" */
    season: z.string().min(1),
    columns: z.array(StatColumnSchema).min(1),
    games: z.array(TrackedGameSchema),
  })
  .superRefine((log, ctx) => {
    figuresMatchColumns(
      log.columns,
      log.games.flatMap((game, index) =>
        game.played
          ? [{ values: game.played.values, path: ["games", index, "played", "values"] }]
          : [],
      ),
      ctx,
    );
  });
export type TrackedGameLog = z.infer<typeof TrackedGameLogSchema>;

/** The static file behind `/family/:slug`. Only the address and the name are required. */
export const TrackedPlayerSchema = z.strictObject({
  /** The `:slug` in `/family/:slug`. */
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
  /** The name the site shows, which is the only name the site knows. */
  name: z.string().min(1),
  /** A small line under the header: "stats may be slightly exaggerated". */
  note: z.string().min(1).optional(),
  profile: TrackedProfileSchema.optional(),
  currentSeason: TrackedSeasonSchema.optional(),
  gameLog: TrackedGameLogSchema.optional(),
  career: TrackedCareerSchema.optional(),
  team: TrackedTeamSchema.optional(),
  /** A player page the family page links to, and what the link is called. */
  projection: z
    .strictObject({
      label: z.string().min(1),
      /** The `:id` in `/players/:id`. */
      playerId: z.string().min(1),
    })
    .optional(),
});
export type TrackedPlayer = z.infer<typeof TrackedPlayerSchema>;
