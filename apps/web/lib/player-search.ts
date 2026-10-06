/**
 * The rules of the search box, apart from `lib/players.ts` so the client component can read them:
 * that file reaches the cache, which a browser cannot.
 */

/** A search starts at this many characters, as in the Parity Reference. */
export const MIN_SEARCH_LENGTH = 2;

/** Longer than any name. What is typed past it is not searched for. */
export const MAX_SEARCH_LENGTH = 50;

/** The address of a search, which can be pasted, reloaded and linked. */
export function searchHref(query: string): string {
  const wanted = query.trim();
  return wanted === "" ? "/players" : `/players?q=${encodeURIComponent(wanted)}`;
}
