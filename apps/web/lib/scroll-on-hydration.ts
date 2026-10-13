/**
 * The router's `scrollRestoration`, as a rule that leaves the scroll to the reader at hydration.
 *
 * With `scrollRestoration: true` the router restores the scroll after every render, and the
 * browser's first render, which is hydration, is one of them (router-core 1.171, `onRendered` in
 * `scroll-restoration.js`): it scrolls to where this entry of the history was left, or to the
 * top. By then the page has been on screen since its HTML came. A reader who has scrolled it is
 * thrown back to the top, and a press under way lands on whatever is under the pointer now, so
 * a link pressed at that moment does nothing.
 *
 * Nothing is lost by leaving that one out. A page loaded as a document starts at the top, and on
 * a reload or a Back to it the browser has already put the scroll back itself: the router hands
 * `history.scrollRestoration` back to it as a document is left.
 *
 * The router asks this rule before each restoring. In the browser it answers no once, at that
 * first render, and yes ever after, so a link still opens a page at its top and Back still
 * returns to where a page was left. On the server it always answers yes: the router asks there
 * whether to write a restoring script into the page, and a no must not be what decides that.
 */
export function restoreScrollAfterHydration(inBrowser: boolean): () => boolean {
  let hydrated = !inBrowser;
  return () => {
    const restore = hydrated;
    hydrated = true;
    return restore;
  };
}
