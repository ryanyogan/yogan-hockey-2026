import type { StandingsRow, Team } from "@yogan-hockey/schemas";
import { ordinal } from "./ordinal";

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
 * Where a team is in the league standings: its conference and division, and its place in the
 * division, counted from one as the Division view of `/nhl` ranks it.
 */
export type TeamStanding = Pick<StandingsRow, "conference" | "division"> & {
  divisionRank: number;
};

/**
 * "6th in Atlantic Division": where a team stands, for the record in its header. The words are
 * the ones ESPN's `standingSummary` had; the place is the site's own, from the standings, since
 * ESPN's has been "1st" in a conference for every team since 2026-10-12 (#209). A dash for a
 * team the standings do not list, or when they could not be read.
 */
export function teamStandingLine(standing: TeamStanding | null): string {
  if (standing == null) return "-";
  return `${ordinal(standing.divisionRank)} in ${standing.division.name}`;
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
