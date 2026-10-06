"use server";

import { findPlayers, type PlayerSearch } from "../../lib/players";

/**
 * The search box's read, as the visitor types. It answers with a `PlayerSearch` whatever ESPN
 * does, so a call that throws in the browser means the call itself failed (the site was deployed
 * under an open tab, or the network dropped), and the box falls back to loading the search's URL.
 */
export async function searchPlayers(query: string): Promise<PlayerSearch> {
  // A Server Action is a public endpoint: what arrives is whatever was sent.
  return findPlayers(typeof query === "string" ? query : "");
}
