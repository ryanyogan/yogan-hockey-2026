/** What this needs of a view transition, and of the document that starts one. */
type Transition = { ready: Promise<unknown> };
type Transitioning = { startViewTransition?: (...args: never[]) => Transition };

const QUIETED = Symbol("skipped view transitions are quiet");

/**
 * Keeps a skipped view transition from being an error of the page's.
 *
 * A navigation is a view transition (`src/router.tsx`). When a second one starts before the
 * first has drawn (the back button pressed twice), the browser skips the first and rejects its
 * `ready` with an `AbortError`. The router starts the transition and keeps only its
 * `updateCallbackDone` (router-core 1.171, `startViewTransition` in `router.ts`), so nobody
 * handles that rejection and it reaches the page as an uncaught error, though both navigations
 * were made and the visitor is where they asked to be.
 *
 * So the document's `startViewTransition` is wrapped, once, to handle that one rejection. Any
 * other failure of a transition is written to the console.
 */
export function quietSkippedTransitions(document: Transitioning): void {
  const start = document.startViewTransition as
    | (((...args: never[]) => Transition) & { [QUIETED]?: true })
    | undefined;
  if (start == null || start[QUIETED]) return;
  const quiet = function (this: unknown, ...args: never[]) {
    const transition = start.apply(this, args);
    transition.ready.catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("A view transition failed", error);
    });
    return transition;
  };
  document.startViewTransition = Object.assign(quiet, { [QUIETED]: true as const });
}
