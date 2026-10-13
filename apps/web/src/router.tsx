import { createRouter } from "@tanstack/react-router";
import { ErrorPage } from "../components/shell/error-page";
import { NotFoundPage } from "../components/shell/not-found-page";
import { restoreScrollAfterHydration } from "../lib/scroll-on-hydration";
import { parseSearchText, stringifySearchText } from "../lib/search-text";
import { quietSkippedTransitions } from "../lib/skipped-transition";
import { routeTree } from "./routeTree.gen";

const MINUTE = 60 * 1000;

/** How long what a loader read is fresh. */
export const FRESH_FOR = 5 * MINUTE;

/**
 * How an address is matched, as the site matched before it was the router's (#211).
 *
 * - By case: `/NHL` is no page. The router's own way is to match without regard to it.
 * - A slash at the end of an address is not the router's business: the Worker's entry has sent
 *   every such request for the site to the address without it (a 308) before the site is asked, and puts one
 *   there itself to carry an address that ends in a space past Start
 *   (`lib/canonical-address.ts`). Under the router's own "never" that slash would be redirected
 *   away again. No link of the site's ends in a slash.
 */
export const ADDRESS_RULES = { caseSensitive: true, trailingSlash: "preserve" } as const;

/**
 * The rules of ADR 0009 that are the router's to keep.
 *
 * - What a loader read is fresh for five minutes, on every route: going back to a page costs
 *   nothing inside that. The router's own default is zero, which reads again on every visit.
 * - What a preload read is good for as long (the router's default is thirty seconds).
 * - A link is preloaded when the visitor shows they mean to follow it: the pointer resting on it
 *   for 65ms, the keyboard's focus, a finger going down.
 * - No route has a pending component, so the page left stays until the next is ready.
 * - A navigation is a view transition where the browser has them (`globals.css` stills it for a
 *   visitor who asked for less motion).
 * - The scroll is the router's to put back (Back returns to where a page was left, a new page
 *   opens at its top), except at hydration, when it is the reader's (`lib/scroll-on-hydration.ts`).
 * - A query string is text, read and written as the address spells it (`lib/search-text.ts`).
 *   The router's own way is JSON, under which `?q=99` is a number and is written back in quotes.
 */
export function getRouter() {
  const inBrowser = typeof document !== "undefined";
  // In the browser: a navigation overtaken by the next is not an error of the page's.
  if (inBrowser) quietSkippedTransitions(document);
  return createRouter({
    routeTree,
    ...ADDRESS_RULES,
    scrollRestoration: restoreScrollAfterHydration(inBrowser),
    defaultStaleTime: FRESH_FOR,
    defaultPreloadStaleTime: FRESH_FOR,
    defaultPreload: "intent",
    defaultPreloadDelay: 65,
    defaultViewTransition: true,
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
    parseSearch: parseSearchText,
    stringifySearch: stringifySearchText,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
