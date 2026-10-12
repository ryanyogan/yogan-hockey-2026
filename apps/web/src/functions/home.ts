import { createServerFn } from "@tanstack/react-start";
import type { StandingsTable } from "@yogan-hockey/schemas";
import { topOfConferences } from "../../lib/dashboard";
import { cachedStandings } from "../../lib/espn";
import { type HomePicks, readHomePicks } from "../../lib/slate-picks";
import { pageRead } from "./page-read";

/**
 * Everything Home draws that is not the Scoreboard's: the made picks of today's games and the
 * season's record, from D1, and each conference's top eight. `standings` is null when ESPN's
 * could not be read: the block says so and the rest of the page is drawn.
 */
export type HomeRead = HomePicks & { standings: StandingsTable[] | null };

/**
 * Home's one read. Each part is an extra and answers without the others (`readHomePicks` never
 * rejects), so Home does not fail for any of them. The standings are cached (`lib/espn.ts`); the
 * picks are read each time, and the Scoreboard moves `invalidatedAt` when one is written.
 */
export const readHome = createServerFn({ method: "GET" }).handler(() =>
  pageRead<HomeRead>(async () => {
    const [picks, standings] = await Promise.all([
      readHomePicks(),
      cachedStandings()
        .then(topOfConferences)
        .catch(() => null),
    ]);
    return { ...picks, standings };
  }),
);
