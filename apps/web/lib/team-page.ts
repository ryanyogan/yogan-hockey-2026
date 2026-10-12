import type { StandingsRow, Team } from "@yogan-hockey/schemas";

/**
 * A team page's tabs, in the order they are drawn. Each is a route of its own under the team's
 * (`src/routes/nhl/teams/$id/route.tsx`): the schedule at the team's address, the others at a
 * segment named for the tab. The header and the tab bar belong to the team's route, so they are
 * read once and stay put while a tab's content changes beneath them.
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
 * Where a team plays, for the red line over its name: its city, then its conference and division.
 * `standing` is the team's row in the league standings, which is where the last two come from;
 * without it the line is the city alone.
 */
export function teamPlace(
  team: Pick<Team, "location">,
  standing: Pick<StandingsRow, "conference" | "division"> | null,
): string[] {
  return [team.location, standing?.conference.name, standing?.division.name].filter(
    (part) => part != null,
  );
}

/**
 * Whether the `:id` of `/nhl/teams/:id` could be a team's. ESPN's ids are digits, and
 * `packages/espn` throws rather than ask ESPN about anything else, so the page checks first and
 * answers "team not found".
 */
export function isTeamId(id: string): boolean {
  return /^\d+$/.test(id);
}
