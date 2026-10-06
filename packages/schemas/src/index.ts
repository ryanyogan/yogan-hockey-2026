import { z } from "zod";

export * from "./final-game.ts";
export * from "./game.ts";
export * from "./play.ts";
export * from "./standings.ts";
export * from "./standings-views.ts";
export * from "./stored-prediction.ts";
export * from "./team.ts";
export * from "./team-page.ts";

/**
 * Walking-skeleton shapes (#31). They stand in for the site's real shapes and
 * are replaced as the issues that own those shapes land.
 */

/** The stub Agent's synced state. */
export const PulseSchema = z.object({
  count: z.number().int().nonnegative(),
  lastBumpAt: z.iso.datetime().nullable(),
});
export type Pulse = z.infer<typeof PulseSchema>;

/** A value that is slow to fetch, so it is read through the cache. */
export const ReadingSchema = z.object({
  serial: z.string().min(1),
  takenAt: z.iso.datetime(),
});
export type Reading = z.infer<typeof ReadingSchema>;
