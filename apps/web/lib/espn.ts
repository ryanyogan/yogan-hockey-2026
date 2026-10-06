import { getStandings, getTeam, getTeamSchedule, getTeams } from "@yogan-hockey/espn";
import type { Standings, Team, TeamDetail, TeamSchedule } from "@yogan-hockey/schemas";
import { unstable_cache } from "next/cache";

/**
 * ESPN reads through vinext's data cache on KV, each with the tag and time limit from the spec's
 * table. Pages read ESPN through these. The Agents call `@yogan-hockey/espn` directly, since they
 * want the answer as it is now, and invalidate these tags when a game goes final.
 *
 * The scoreboard is not here: live scores come from the Scoreboard Agent, never from this cache.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export const STANDINGS_TAG = "standings";
export const TEAMS_TAG = "teams";

/** The tag on everything cached about one team: its page and its schedule. */
export function teamTag(teamId: string): string {
  return `team:${teamId}`;
}

/** The league standings. Five minutes. */
export const cachedStandings: () => Promise<Standings> = unstable_cache(
  getStandings,
  ["espn-standings"],
  { tags: [STANDINGS_TAG], revalidate: 5 * MINUTE },
);

/** Every NHL team. Twenty-four hours. */
export const cachedTeams: () => Promise<Team[]> = unstable_cache(getTeams, ["espn-teams"], {
  tags: [TEAMS_TAG],
  revalidate: 24 * HOUR,
});

/** A team's page: record, roster and team stats. One hour. */
export function cachedTeam(teamId: string): Promise<TeamDetail> {
  return unstable_cache(() => getTeam(teamId), ["espn-team", teamId], {
    tags: [teamTag(teamId)],
    revalidate: HOUR,
  })();
}

/** A team's schedule. One hour. */
export function cachedTeamSchedule(teamId: string): Promise<TeamSchedule> {
  return unstable_cache(() => getTeamSchedule(teamId), ["espn-team-schedule", teamId], {
    tags: [teamTag(teamId)],
    revalidate: HOUR,
  })();
}
