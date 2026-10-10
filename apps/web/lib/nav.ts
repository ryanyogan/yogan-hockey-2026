export type NavItem = {
  label: string;
  href: string;
  /** Whether a page at this path, with this `tab` in its query, belongs to the item. */
  owns: (pathname: string, tab: string | null) => boolean;
};

const under = (pathname: string, root: string) =>
  pathname === root || pathname.startsWith(`${root}/`);

/** The same five destinations stay visible on desktop and phone. */
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
    owns: (pathname, tab) => pathname === "/nhl" && tab !== "teams",
  },
  {
    label: "Teams",
    href: "/nhl?tab=teams",
    owns: (pathname, tab) =>
      (pathname === "/nhl" && tab === "teams") || under(pathname, "/nhl/teams"),
  },
  { label: "Players", href: "/players", owns: (pathname) => under(pathname, "/players") },
];

export function currentNavItem(pathname: string, tab: string | null): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.owns(pathname, tab));
}
