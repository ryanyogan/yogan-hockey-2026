import { env } from "cloudflare:workers";
import { createDb, getSeasonRecord } from "@yogan-hockey/db";
import type { ScoreboardReading, SeasonRecord } from "@yogan-hockey/schemas";
import { seasonNow } from "./picks";

/**
 * A season's record of the picks, read from D1. The root route wants it for the dateline and Home
 * for The Picks box: each is a server function of its own and reads it for itself, so Home's
 * first load reads it twice.
 */
export const seasonRecord = (season: number): Promise<SeasonRecord | null> =>
  getSeasonRecord(createDb(env.DB), season);

/**
 * The season's record of the picks, for the masthead's dateline on every page. It waits for the
 * shell's read of the Scoreboard only to know the season; where that has no slate's date, the
 * season is the calendar's.
 *
 * It never rejects: a dateline without its picks is still a dateline.
 */
export async function readSeasonRecord(
  scoreboard: Promise<ScoreboardReading> | null,
): Promise<SeasonRecord | null> {
  try {
    const date = (await scoreboard)?.date ?? null;
    return await seasonRecord(seasonNow(date, new Date()));
  } catch (error) {
    console.error("Masthead: the season's record could not be read", error);
    return null;
  }
}
