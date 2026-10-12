import { env } from "cloudflare:workers";
import { createDb, getSeasonRecord } from "@yogan-hockey/db";
import type { ScoreboardReading, SeasonRecord } from "@yogan-hockey/schemas";
import { cache } from "react";
import { seasonNow } from "./picks";

/**
 * A season's record of the picks, read from D1 once a request: the layout wants it for the
 * dateline and Home for The Picks box, and both ask for the same season.
 */
export const seasonRecord = cache(
  (season: number): Promise<SeasonRecord | null> => getSeasonRecord(createDb(env.DB), season),
);

/**
 * The season's record of the picks, for the masthead's dateline on every page. It waits for the
 * layout's read of the Scoreboard only to know the season, and does without it on a page drawn
 * with no slate (`scoreboard` null: the page cache's), where the season is the calendar's.
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
