import { createServerFn } from "@tanstack/react-start";
import type { News, StandingsTable } from "@yogan-hockey/schemas";
import { topOfConferences } from "../../lib/dashboard";
import { cachedStandings } from "../../lib/espn";
import { readHomeNews } from "../../lib/home-news";
import { type HomePicks, readHomePicks } from "../../lib/slate-picks";
import { pageRead } from "./page-read";

/**
 * Everything Home draws that is not the Scoreboard's: the made picks of today's games and the
 * season's record, from D1, each conference's top eight, and ESPN's headlines. `standings` is null
 * when ESPN's could not be read: the block says so and the rest of the page is drawn. `news` is
 * null when ESPN's could not be read or it had none: its section is left out.
 */
export type HomeRead = HomePicks & { standings: StandingsTable[] | null; news: News | null };

/**
 * Home's one read. Each part is an extra and answers without the others (`readHomePicks` and
 * `readHomeNews` never reject), so Home does not fail for any of them. The standings and the news
 * are cached (`lib/espn.ts`); the picks are read each time, and the Scoreboard moves `invalidatedAt` when one is written.
 */
export const readHome = createServerFn({ method: "GET" }).handler(() =>
  pageRead<HomeRead>(async () => {
    const [picks, standings, news] = await Promise.all([
      readHomePicks(),
      cachedStandings()
        .then(topOfConferences)
        .catch(() => null),
      readHomeNews(),
    ]);
    return { ...picks, standings, news };
  }),
);
