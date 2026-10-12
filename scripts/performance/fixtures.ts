// What a fixture build must have done before it is measured, read from its own answers.

/**
 * Whether the recorded finished game is ready to measure, from an answer for its page.
 *
 * Archived: the server drew the Replay's transport, which it does only from the plays in D1. A
 * page opened before that draws the plays ESPN sent and asks again from the browser.
 *
 * Kept: on a site with a page cache (vinext, which says `x-page-cache` on every page) the cache
 * must also be answering the page (`hit` or `stale`), or its "cached" rows are of a rendered
 * page. A site that sends no such header keeps no pages (TanStack Start, ADR 0009) and has
 * nothing more to wait for.
 */
export function finishedGameReady(answer: {
  ok: boolean;
  pageCache: string | null;
  html: string;
}): boolean {
  if (!answer.ok || !answer.html.includes('data-slot="replay-transport"')) return false;
  return answer.pageCache == null || answer.pageCache === "hit" || answer.pageCache === "stale";
}
