/**
 * A team page's tabs, in the order they are drawn. Each is a page of its own under the team's
 * layout (`app/nhl/teams/[id]/layout.tsx`): the schedule at the team's address, the others at a
 * segment named for the tab. The header and the tab bar belong to the layout, so they are
 * rendered once and stay put while a tab's content changes beneath them.
 */
export const TEAM_TABS = ["schedule", "roster", "stats"] as const;
export type TeamTab = (typeof TEAM_TABS)[number];

const DEFAULT_TAB: TeamTab = "schedule";

/** The URL of one tab of a team's page. The schedule is the team's own address. */
export function teamPageHref(teamId: string, tab: TeamTab): string {
  const page = `/nhl/teams/${teamId}`;
  return tab === DEFAULT_TAB ? page : `${page}/${tab}`;
}

/** Which tab a path under `/nhl/teams/:id` is: its last segment, or the schedule. */
export function teamTabOfPath(pathname: string): TeamTab {
  const last = pathname.split("/").filter(Boolean).at(3);
  return TEAM_TABS.find((tab) => tab === last) ?? DEFAULT_TAB;
}

/**
 * Until #94 a tab was `?tab=roster`. Those addresses are out in the world, so each goes to its
 * new one for good (308); `next.config.ts` hands these to vinext. `?tab=schedule`, and a `?tab=`
 * that names no tab, are left alone and show the schedule, as they always did: a redirect keeps
 * the query string, so one from the team's address to itself would never end.
 */
export function legacyTeamTabRedirects() {
  return TEAM_TABS.filter((tab) => tab !== DEFAULT_TAB).map((tab) => ({
    source: "/nhl/teams/:id",
    has: [{ type: "query" as const, key: "tab", value: tab }],
    destination: teamPageHref(":id", tab),
    permanent: true,
  }));
}

/**
 * Whether the `:id` of `/nhl/teams/:id` could be a team's. ESPN's ids are digits, and
 * `packages/espn` throws rather than ask ESPN about anything else, so the page checks first and
 * answers "team not found".
 */
export function isTeamId(id: string): boolean {
  return /^\d+$/.test(id);
}
