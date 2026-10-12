export type NavItem = {
  label: string;
  href: string;
  /** Whether a page at this path, with this `tab` in its query, belongs to the item. */
  owns: (pathname: string, tab: string | null) => boolean;
};

const under = (pathname: string, root: string) =>
  pathname === root || pathname.startsWith(`${root}/`);

/** The one `tab` that changes which place a page belongs to: `/nhl` is Standings without it. */
const TEAMS_TAB = "teams";

/** The five sections of the masthead's nav, at any width. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Home", href: "/", owns: (pathname) => pathname === "/" },
  {
    label: "Scores",
    href: "/nhl/live",
    owns: (pathname) => under(pathname, "/nhl/live") || under(pathname, "/nhl/games"),
  },
  {
    label: "Standings",
    href: "/nhl",
    owns: (pathname, tab) => pathname === "/nhl" && tab !== TEAMS_TAB,
  },
  {
    label: "Teams",
    href: `/nhl?tab=${TEAMS_TAB}`,
    owns: (pathname, tab) =>
      (pathname === "/nhl" && tab === TEAMS_TAB) || under(pathname, "/nhl/teams"),
  },
  { label: "Players", href: "/players", owns: (pathname) => under(pathname, "/players") },
];

export function currentNavItem(pathname: string, tab: string | null): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.owns(pathname, tab));
}

/**
 * The place a path belongs to whatever its query string says, or none where the query decides
 * (`/nhl`, which is Standings or Teams). It is what can be marked before the query is known:
 * the links' first paint, while the server has yet to hand a client component the query.
 */
export function navItemByPathAlone(pathname: string): NavItem | undefined {
  const without = currentNavItem(pathname, null);
  return currentNavItem(pathname, TEAMS_TAB) === without ? without : undefined;
}

/**
 * Whether a page carries the score strip under the masthead. Home does not: its stories and
 * briefs are the scores.
 */
export function showsScoreStrip(pathname: string): boolean {
  return pathname !== "/";
}
