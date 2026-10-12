import { type RouterState, useRouterState } from "@tanstack/react-router";

/**
 * The address of the page that is drawn. While a link's page is being read the router already
 * holds the address being gone to, and the page left is still on screen, so what says where the
 * visitor is (the current section, the score strip, a tab) reads the address the router last
 * finished with until the read is over. The router swaps the page and ends `isLoading` together,
 * so the address changes in the same paint as the page.
 */
function drawn(state: RouterState) {
  return state.isLoading ? (state.resolvedLocation ?? state.location) : state.location;
}

/** The path of the page that is drawn: "/nhl/teams/21". */
export function usePathname(): string {
  return useRouterState({ select: (state) => drawn(state).pathname });
}

/** One parameter of the drawn page's query string, as the address spells it; null when absent. */
export function useSearchParam(name: string): string | null {
  return useRouterState({
    select: (state) => new URLSearchParams(drawn(state).searchStr).get(name),
  });
}
