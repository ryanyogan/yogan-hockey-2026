import { z } from "zod";
import type { PlayerSearch } from "./players";

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
 * Reads `/players`' search from its query string (`lib/search-text.ts`): trimmed, and no longer
 * than a name, so every spelling of one search is one read. A search given twice is no search.
 */
export function readPlayersPage(query: Record<string, unknown>): PlayersPage {
  const text = typeof query.q === "string" ? query.q : "";
  return { q: text.trim().slice(0, MAX_SEARCH_LENGTH) };
}

/**
 * What the page shows for a search that got no answer at all: the call itself failed (the network
 * dropped, or the tab is older than the last deploy and the server no longer knows the call).
 * The page says the search is not answering; a query too short to search for needed no answer.
 */
export function unansweredSearch(query: string): PlayerSearch {
  const status = query.length < MIN_SEARCH_LENGTH ? "idle" : "unavailable";
  return { status, query, players: [] };
}

/** What the search's loading needs of a browser. On the server there is none. */
export type SearchBrowser = {
  /** Whether the browser believes it has a network. */
  online(): boolean;
  /** Loads the address the browser is at as a document. */
  reload(): void;
};

/**
 * How `/players` loads its search: the route's `loader` and `shouldReload`, around the call that
 * asks the server (`read`).
 *
 * - A search starts at two characters: less is answered here, with nothing asked.
 * - An answer is the router's to keep for as long as any route's (`src/router.tsx`), unless it
 *   was "not answering": that one is asked for again the next time its search is loaded, or the
 *   visitor who tries again shortly would be shown the same failure for five minutes.
 * - A call that fails in a browser that is on line is most likely a tab older than the last
 *   deploy, which the server no longer has an answer for: the address, which holds the search,
 *   is loaded as a document, and the new page is the search. It cannot go round: a document's
 *   search is read on the server, with no call to fail. Off line, or for a page that is only
 *   being read ahead, the search says it is not answering and the box keeps what was typed.
 * - On the server a failed read is the error page's.
 */
export function searchLoading(
  read: (page: PlayersPage) => Promise<PlayerSearch>,
  browser: SearchBrowser | null,
) {
  // The searches last answered "not answering", in this browser. Never touched on the server,
  // where it would be every visitor's.
  const unanswered = new Set<string>();
  const drawn = (answer: PlayerSearch): PlayerSearch => {
    if (browser == null) return answer;
    if (answer.status === "unavailable") unanswered.add(answer.query);
    else unanswered.delete(answer.query);
    return answer;
  };

  return {
    async loader({ deps, preload }: { deps: PlayersPage; preload: boolean }) {
      if (deps.q.length < MIN_SEARCH_LENGTH) return unansweredSearch(deps.q);
      try {
        return drawn(await read(deps));
      } catch (error) {
        if (browser == null) throw error;
        if (!preload && browser.online()) {
          browser.reload();
          // The page that is drawn stays as it is until the document replaces it.
          return new Promise<PlayerSearch>(() => {});
        }
        return drawn(unansweredSearch(deps.q));
      }
    },
    /** True for a search to ask again whatever its age; otherwise the router's own rule. */
    shouldReload: ({ deps }: { deps: PlayersPage }) => unanswered.has(deps.q) || undefined,
    /**
     * Tells the loading of an answer it did not read itself: the one in a document's HTML, which
     * the server read.
     */
    drawn,
  };
}
