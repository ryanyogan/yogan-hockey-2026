import { createServerFn } from "@tanstack/react-start";
import type { News, Piece, StandingsTable } from "@yogan-hockey/schemas";
import { topOfConferences } from "../../lib/dashboard";
import { cachedStandings } from "../../lib/espn";
import { readHomeNews } from "../../lib/home-news";
import { readHomePieces } from "../../lib/home-pieces";
import { type HomePicks, readHomePicks } from "../../lib/slate-picks";
import { pageRead } from "./page-read";

/**
 * Everything Home draws that is not the Scoreboard's: the made picks of today's games and the
 * season's record, from D1, each conference's top eight, the written pieces and ESPN's headlines.
 * `standings` is null when ESPN's could not be read: the block says so and the rest of the page
 * is drawn. `news` is null when ESPN's could not be read or it had none, and `pieces` when none
 * was published in the last 30 hours: either's section is left out.
 */
export type HomeRead = HomePicks & {
  standings: StandingsTable[] | null;
  pieces: Piece[] | null;
  news: News | null;
};

/**
 * Home's one read. Each part is an extra and answers without the others (`readHomePicks`,
 * `readHomePieces` and `readHomeNews` never reject), so Home does not fail for any of them. The
 * standings and the news are cached (`lib/espn.ts`); the picks and the pieces are read from D1
 * each time. The Scoreboard moves `invalidatedAt` when a pick is written; nothing does when a
 * piece is, so an open Home shows a new piece when it is next read.
 */
export const readHome = createServerFn({ method: "GET" }).handler(() =>
  pageRead<HomeRead>(async () => {
    const [picks, standings, pieces, news] = await Promise.all([
      readHomePicks(),
      cachedStandings()
        .then(topOfConferences)
        .catch(() => null),
      readHomePieces(),
      readHomeNews(),
    ]);
    return { ...picks, standings, pieces, news };
  }),
);
