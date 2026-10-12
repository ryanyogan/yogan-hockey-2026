import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { GameSchema, type Play } from "@yogan-hockey/schemas";
import { isGameId } from "../../lib/game/page-state";
import { type GamePageRead, readGamePage } from "../../lib/game-page";
import { replayPlays } from "../../lib/replay";
import { pageRead } from "./page-read";

/** What `/nhl/games/:id` draws: a game, or the words for one that could not be read just now. */
export type GameRead = Exclude<GamePageRead, { state: "missing" }>;

/**
 * A game's id as it arrives from outside: the site's own schema for it, which asks only that it
 * be there. One that is no game's is a 404 and not a fault, so `findGame` tells the two apart.
 */
const GameIdSchema = GameSchema.pick({ id: true });

/**
 * `/nhl/games/:id`'s one read, for the page and all three of its tabs: the Game Agent's answer,
 * a finished game's plays from D1, the pick and a scheduled game's matchup facts
 * (`lib/game-page.ts`). A game that does not exist is the route's not-found page.
 */
export const readGameRoute = createServerFn({ method: "GET" })
  .validator(GameIdSchema)
  .handler(({ data }) =>
    pageRead<GameRead>(async () => {
      const read = await readGamePage(data.id);
      if (read.state === "missing") throw notFound();
      return read;
    }),
  );

/**
 * A finished game's plays from D1, for a page that was open when the game ended, or that opened
 * before the game could be archived (`components/game/finished-game.tsx`). Null while there is
 * nothing to replay yet; the page asks again. It answers null instead of throwing for anything it
 * cannot serve.
 */
export const readReplayPlays = createServerFn({ method: "GET" })
  .validator(GameIdSchema)
  .handler(async ({ data: { id: gameId } }): Promise<Play[] | null> => {
    if (!isGameId(gameId)) return null;
    try {
      return await replayPlays(gameId);
    } catch (error) {
      console.error(`Game ${gameId}: the replay could not be read`, error);
      return null;
    }
  });
