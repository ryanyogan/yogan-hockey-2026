import { env } from "cloudflare:workers";
import { createDb, getPredictions } from "@yogan-hockey/db";
import type { MadeSlatePick, SeasonRecord } from "@yogan-hockey/schemas";
import { madePicks, seasonOfSlate, slatePicks } from "./picks";
import { readScoreboard } from "./scoreboard";
import { seasonRecord } from "./season-record";

export type SlatePicks = {
  /** Each game's pick in one line, by game id. A game with nothing to say has no entry. */
  picks: Record<string, string>;
};

/** What Home says about the picks: the copy (`lib/agate-copy.ts`) writes its sentences from this. */
export type HomePicks = {
  /** The made picks of today's games, by game id. */
  picks: Record<string, MadeSlatePick>;
  /** The record of the slate's season, or null when it could not be read. */
  record: SeasonRecord | null;
};

/**
 * The one-line picks of today's slate, read from D1 by a page's server component. Prediction rows
 * are behind no cache tag, so this is read on every render; the Scoreboard moves `invalidatedAt`
 * when a row is written, which is what renders an open page again.
 *
 * The picks are an extra: when the Scoreboard or D1 cannot be read the page is drawn without them.
 */
export async function readSlatePicks(): Promise<SlatePicks> {
  try {
    const { date, games } = await readScoreboard();
    if (date == null) return { picks: {} };
    const predictions = await getPredictions(
      createDb(env.DB),
      games.map((game) => game.id),
    );
    return { picks: slatePicks(games, predictions, new Date()) };
  } catch (error) {
    console.error("The picks could not be read", error);
    return { picks: {} };
  }
}

/**
 * Home's picks and the season's record, read as `readSlatePicks` reads, and as much an extra. The
 * season is the slate's own (`seasonOfSlate`), not a year written down here; its record is the
 * read the layout makes for the dateline (`seasonRecord`), not a second one.
 */
export async function readHomePicks(): Promise<HomePicks> {
  try {
    const { date, games } = await readScoreboard();
    if (date == null) return { picks: {}, record: null };
    const [predictions, record] = await Promise.all([
      getPredictions(
        createDb(env.DB),
        games.map((game) => game.id),
      ),
      // The record is its own extra: the picks are drawn without it.
      seasonRecord(seasonOfSlate(date)).catch((error) => {
        console.error("Home: the season's record could not be read", error);
        return null;
      }),
    ]);
    return { picks: madePicks(predictions), record };
  } catch (error) {
    console.error("The picks could not be read", error);
    return { picks: {}, record: null };
  }
}
