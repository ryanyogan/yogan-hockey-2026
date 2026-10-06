import { env } from "cloudflare:workers";
import { createDb, getPredictions, getSeasonRecord } from "@yogan-hockey/db";
import { recordLine, seasonOfSlate, slatePicks } from "./picks";
import { readScoreboard } from "./scoreboard";

export type SlatePicks = {
  /** Each game's pick in one line, by game id. A game with nothing to say has no entry. */
  picks: Record<string, string>;
  /** "picks: 34 right, 21 wrong" for the slate's season, or null before any pick is decided. */
  record: string | null;
};

/**
 * The picks of today's slate and the season record, read from D1 by a page's server component.
 * Prediction rows are behind no cache tag, so this is read on every render; the Scoreboard moves
 * `invalidatedAt` when a row is written, which is what renders an open page again.
 *
 * The season is the slate's own (`seasonOfSlate`), not a year written down here. The picks are
 * an extra: when the Scoreboard or D1 cannot be read the page is drawn without them.
 */
export async function readSlatePicks(): Promise<SlatePicks> {
  try {
    const { date, games } = await readScoreboard();
    if (date == null) return { picks: {}, record: null };
    const db = createDb(env.DB);
    const gameIds = games.map((game) => game.id);
    const [predictions, record] = await Promise.all([
      getPredictions(db, gameIds),
      getSeasonRecord(db, seasonOfSlate(date)),
    ]);
    return { picks: slatePicks(games, predictions), record: recordLine(record) };
  } catch (error) {
    console.error("The picks could not be read", error);
    return { picks: {}, record: null };
  }
}
