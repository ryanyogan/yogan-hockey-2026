import { env } from "cloudflare:workers";
import { createDb, getPredictions, getSeasonPicks } from "@yogan-hockey/db";
import type { MadeSlatePick, Piece } from "@yogan-hockey/schemas";
import { NHL_TIME_ZONE } from "./game-time";
import { readColumns } from "./home-pieces";
import { madePicks, seasonOfSlate } from "./picks";
import { type PicksFigures, picksFigures } from "./picks-figures";
import { readScoreboard } from "./scoreboard";

/** Everything `/picks` draws that the Scoreboard's socket does not bring (#218). */
export type PicksPage = {
  /** The season's figures, or null when D1 did not answer. */
  figures: PicksFigures | null;
  /** The made picks of today's games, by game id. */
  picks: Record<string, MadeSlatePick>;
  /** The columns to show, or null when there are none. */
  columns: Piece[] | null;
};

/** The day it is where the NHL keeps its days: the Canadian form of a date is year-month-day. */
const easternDay = (now: Date): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: NHL_TIME_ZONE }).format(now);

/**
 * The Picks page's one read. Its three parts are each an extra to the other two, read at once:
 * the figures (every pick of the season from D1, worked out in `picks-figures.ts`), tonight's
 * picks, and the columns. One that cannot be read is null or empty and the page says so or
 * leaves it out, so this never rejects.
 *
 * "Today" is the slate's date, and the season is the slate's; where the Scoreboard has no slate
 * or cannot be read, both are the calendar's.
 */
export async function readPicksPage(now: Date = new Date()): Promise<PicksPage> {
  const slate = await readScoreboard().catch((error) => {
    console.error("Picks: the Scoreboard could not be read", error);
    return null;
  });
  const today = slate?.date ?? easternDay(now);
  const db = createDb(env.DB);

  const [figures, picks, columns] = await Promise.all([
    getSeasonPicks(db, seasonOfSlate(today))
      .then((season) => picksFigures(season, today))
      .catch((error) => {
        console.error("Picks: the season's picks could not be read", error);
        return null;
      }),
    getPredictions(db, slate?.date == null ? [] : slate.games.map((game) => game.id))
      .then(madePicks)
      .catch((error) => {
        console.error("Picks: tonight's picks could not be read", error);
        return {};
      }),
    readColumns(now),
  ]);
  return { figures, picks, columns };
}
