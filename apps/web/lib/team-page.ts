import { first, type Query } from "./nhl-page";

/** A team page's tabs, in the order they are drawn. The value is what the URL holds in `?tab=`. */
export const TEAM_TABS = ["schedule", "roster", "stats"] as const;
export type TeamTab = (typeof TEAM_TABS)[number];

/** What a team page shows beyond its header. */
export type TeamPage = { tab: TeamTab };

const DEFAULT_TAB: TeamTab = "schedule";

/** Reads a team page's tab from its query string. Anything unknown falls back to the schedule. */
export function readTeamPage(query: Query): TeamPage {
  const tab = TEAM_TABS.find((candidate) => candidate === first(query.tab));
  return { tab: tab ?? DEFAULT_TAB };
}

/** The URL of one tab of a team's page, with the default left out so each tab has one address. */
export function teamPageHref(teamId: string, tab: TeamTab): string {
  const page = `/nhl/teams/${teamId}`;
  return tab === DEFAULT_TAB ? page : `${page}?tab=${tab}`;
}

/**
 * Whether the `:id` of `/nhl/teams/:id` could be a team's. ESPN's ids are digits, and
 * `packages/espn` throws rather than ask ESPN about anything else, so the page checks first and
 * answers "team not found".
 */
export function isTeamId(id: string): boolean {
  return /^\d+$/.test(id);
}
