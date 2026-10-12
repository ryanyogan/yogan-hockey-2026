import { z } from "zod";

/**
 * The rules of the search box, apart from `lib/players.ts` so the client component can read them:
 * that file reaches the cache, which a browser cannot.
 */

/** A search starts at this many characters, as in the Parity Reference. */
export const MIN_SEARCH_LENGTH = 2;

/** Longer than any name. What is typed past it is not searched for. */
export const MAX_SEARCH_LENGTH = 50;

/** What `/players` shows: the search its address names, "" for none. */
export type PlayersPage = { q: string };

/** `PlayersPage` as it arrives from outside: what the page's server function accepts. */
export const PlayersPageSchema = z.object({ q: z.string().max(MAX_SEARCH_LENGTH) });

/**
 * Reads `/players`' search from its query string: trimmed, and no longer than a name, so every
 * spelling of one search is one read. The router reads a query's values as JSON where it can, so
 * `?q=99` arrives as a number and `?q=true` as a boolean: a search is the text all the same.
 * Anything else (`q` given twice, as before the port) is no search.
 */
export function readPlayersPage(query: Record<string, unknown>): PlayersPage {
  const given = query.q;
  const text = ["string", "number", "boolean"].includes(typeof given) ? `${given}` : "";
  return { q: text.trim().slice(0, MAX_SEARCH_LENGTH) };
}

/** The answer to a search, as `lib/players.ts` gives it (which a browser cannot import). */
type Answer = { status: "idle" | "unavailable"; query: string; players: [] };

/**
 * What the page shows for a search that got no answer at all: the call itself failed (the network
 * dropped, or the tab is older than the last deploy and the server no longer knows the call).
 * The page says the search is not answering; a query too short to search for needed no answer.
 */
export function unansweredSearch(query: string): Answer {
  const status = query.length < MIN_SEARCH_LENGTH ? "idle" : "unavailable";
  return { status, query, players: [] };
}
