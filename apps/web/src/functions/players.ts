import { createServerFn } from "@tanstack/react-start";
import type { PlayerProfile } from "@yogan-hockey/schemas";
import { z } from "zod";
import { pageNotFound } from "../../lib/page-not-found";
import { PlayersPageSchema } from "../../lib/player-search";
import {
  type CareerView,
  careerView,
  type GameLogView,
  gameLogView,
  type SeasonView,
  seasonView,
} from "../../lib/player-view";
import { findPlayers, loadPlayer, type PlayerSearch } from "../../lib/players";
import { pageRead } from "./page-read";

/**
 * `/players`' one read: the search its address names. It answers with a `PlayerSearch` whatever
 * ESPN does, so the visitor's typing never ends in an error page.
 */
export const readPlayers = createServerFn({ method: "GET" })
  .validator(PlayersPageSchema)
  .handler(({ data: page }) => pageRead<PlayerSearch>(() => findPlayers(page.q)));

/**
 * Everything a player's page draws, on either of its tabs: who he is, his season, his career and
 * every game of his log, which the default tab shows the latest of. Each is null where he has
 * none.
 */
export type PlayerRead = {
  profile: PlayerProfile;
  season: SeasonView | null;
  career: CareerView | null;
  log: GameLogView | null;
};

/**
 * A player's one read, by the `:id` of his page. Any text is accepted as an id: `loadPlayer`
 * asks ESPN only for what can be one, and an id that is nobody's is the page's 404.
 */
export const readPlayer = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(({ data: { id } }) =>
    pageRead<PlayerRead>(async () => {
      const player = await loadPlayer(id);
      if (!player) pageNotFound();
      const { profile, career, gameLog } = player;
      return {
        profile,
        season: seasonView(profile, career, gameLog),
        career: careerView(career),
        log: gameLogView(gameLog, Number.POSITIVE_INFINITY),
      };
    }),
  );
