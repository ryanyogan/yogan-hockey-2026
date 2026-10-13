/*
 * Two things about an address the Worker's entry settles before the site sees the request, each
 * as the site answered before it moved to TanStack Start (#211).
 */

/**
 * Where an address ending in a slash lives, or null for one that ends in none: the same address
 * without it, the query kept. The Worker's entry sends it there for good (308), whatever the
 * method. Left to the router it is a 307.
 *
 * `/` has no slash to lose, and neither has a path of slashes alone.
 */
export function trailingSlashLocation(url: URL): string | null {
  const path = url.pathname.replace(/\/+$/, "");
  if (path === url.pathname || path === "") return null;
  return url.origin + path + url.search;
}

/**
 * The address to ask the site for when the one asked ends in a space (`/nhl/teams/%20`), or null
 * for any other.
 *
 * Start decodes a request's path and parses it again as a URL, which drops a space at the very
 * end: `/nhl/teams/%20` reached the router as `/nhl/teams/`, a 307 to `/nhl/teams`, and
 * `/nhl/teams/21%20` was Toronto's page. A slash after the space keeps it. The router then reads
 * the same path the browser's does from the address bar (a space for the team's id, which the
 * team's read answers "not found"), so the page hydrates as it was drawn. This needs the router
 * to leave that slash alone: `trailingSlash: "preserve"` in `src/router.tsx`.
 *
 * A space anywhere else in the path, or in the query, survives by itself. So does one before a
 * query, which is given its slash all the same: one rule, and the answer is the same.
 */
export function spaceEndedAddress(url: URL): URL | null {
  if (!/%20$/.test(url.pathname)) return null;
  const kept = new URL(url);
  kept.pathname += "/";
  return kept;
}
