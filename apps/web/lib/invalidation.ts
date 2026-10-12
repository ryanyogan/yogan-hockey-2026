/** When cached data was last invalidated, as the Scoreboard has it; null for never. */
type InvalidatedAt = string | null;

/**
 * Whether what the page's loaders read is out of date and must be read again.
 *
 * - `rendered`: `invalidatedAt` as the root route's loader read it for what is on the page;
 *   undefined when there is none to compare with.
 * - `heard`: `invalidatedAt` in the latest state on the Scoreboard's socket; undefined until the
 *   socket has spoken.
 * - `refreshedFor`: the `heard` the page last refreshed for, so each invalidation refreshes once
 *   even if the read that follows comes back no newer.
 *
 * A refresh is due when the socket knows of an invalidation later than the one the page was
 * read with: a game went final, a pick was written, a catch-up recorded games.
 */
export function refreshDue({
  rendered,
  heard,
  refreshedFor,
}: {
  rendered: InvalidatedAt | undefined;
  heard: InvalidatedAt | undefined;
  refreshedFor: InvalidatedAt | undefined;
}): boolean {
  if (rendered === undefined || heard == null) return false;
  if (heard === refreshedFor) return false;
  return rendered == null || Date.parse(heard) > Date.parse(rendered);
}
