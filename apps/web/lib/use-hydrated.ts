import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

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
