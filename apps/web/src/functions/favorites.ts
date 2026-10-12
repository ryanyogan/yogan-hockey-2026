import { createServerFn } from "@tanstack/react-start";
import { loadFavoritePlayers } from "../../lib/favorite-players";
import { readFavoriteIds } from "../../lib/favorites";

/**
 * Resolving favorites: the browser holds its favorite players as ids, and this turns them into
 * the rows a list shows (name, team, a season line). It is one of the two calls made outside a
 * loader (ADR 0009), since only the browser knows the ids: `useFavoritePlayers` makes it.
 *
 * Anyone can call it, so what arrives is read as a stored list is (`readFavoriteIds`): whatever
 * is not an id is dropped, and no more than a visitor can keep are read. An id that is nobody's
 * is left out of the answer, and one ESPN would not answer for is reported in `unread`; it does
 * not throw for either.
 */
export const resolveFavoritePlayers = createServerFn({ method: "GET" })
  .validator((ids: unknown) => readFavoriteIds(ids))
  .handler(({ data: ids }) => loadFavoritePlayers(ids));
