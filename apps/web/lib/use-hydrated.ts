import { useSyncExternalStore } from "react";

/** For a `useSyncExternalStore` whose value never changes once the browser has it. */
export const subscribeToNothing = () => () => {};

/**
 * False on the server and while the page hydrates, true from then on. For what only the browser
 * knows (its storage, the theme shown): the first render in the browser must repeat the server's.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}
