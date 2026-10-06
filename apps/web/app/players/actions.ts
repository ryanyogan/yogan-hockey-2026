"use server";

import { type FavoritePlayers, loadFavoritePlayers } from "../../lib/favorite-players";
import { findPlayers, type PlayerSearch } from "../../lib/players";

/**
 * Resolving favorites: the browser holds its favorite players as ids, and this turns them into
 * the rows a list shows (name, team, a season line). An id that is nobody's is left out. Like
 * the search it answers whatever ESPN does, and it reads its argument as untrusted.
 */
export async function resolveFavoritePlayers(ids: string[]): Promise<FavoritePlayers> {
  return loadFavoritePlayers(ids);
}

/**
 * The search box's read, as the visitor types. It answers with a `PlayerSearch` whatever ESPN
 * does, so a call that throws in the browser means the call itself failed (the site was deployed
 * under an open tab, or the network dropped), and the box falls back to loading the search's URL.
 */
export async function searchPlayers(query: string): Promise<PlayerSearch> {
  // A Server Action is a public endpoint: what arrives is whatever was sent.
  return findPlayers(typeof query === "string" ? query : "");
}
