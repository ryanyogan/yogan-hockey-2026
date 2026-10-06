export type NavItem = {
  label: string;
  href: string;
  /** Whether a page at this path, with this `tab` in its query, belongs to the item. */
  owns: (pathname: string, tab: string | null) => boolean;
};

const under = (pathname: string, root: string) =>
  pathname === root || pathname.startsWith(`${root}/`);

/** The site's places, in the Parity Reference's order. The wordmark, not an item, leads to `/`. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "standings",
    href: "/nhl",
    owns: (pathname, tab) => pathname === "/nhl" && tab !== "teams",
  },
  {
    label: "teams",
    href: "/nhl?tab=teams",
    owns: (pathname, tab) =>
      (pathname === "/nhl" && tab === "teams") || under(pathname, "/nhl/teams"),
  },
  { label: "players", href: "/players", owns: (pathname) => under(pathname, "/players") },
  { label: "family", href: "/family/rylan", owns: (pathname) => under(pathname, "/family") },
  {
    label: "live scores",
    href: "/nhl/live",
    owns: (pathname) => under(pathname, "/nhl/live") || under(pathname, "/nhl/games"),
  },
];

export function currentNavItem(pathname: string, tab: string | null): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.owns(pathname, tab));
}
