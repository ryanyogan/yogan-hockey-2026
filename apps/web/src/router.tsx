import { createRouter } from "@tanstack/react-router";
import { ErrorPage } from "../components/shell/error-page";
import { NotFoundPage } from "../components/shell/not-found-page";
import { quietSkippedTransitions } from "../lib/skipped-transition";
import { routeTree } from "./routeTree.gen";

const MINUTE = 60 * 1000;

/** How long what a loader read is fresh. */
export const FRESH_FOR = 5 * MINUTE;

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
 */
export function getRouter() {
  // In the browser: a navigation overtaken by the next is not an error of the page's.
  if (typeof document !== "undefined") quietSkippedTransitions(document);
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultStaleTime: FRESH_FOR,
    defaultPreloadStaleTime: FRESH_FOR,
    defaultPreload: "intent",
    defaultPreloadDelay: 65,
    defaultViewTransition: true,
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
