import type { Team } from "@yogan-hockey/schemas";

/** A team's page. */
export function teamHref(team: Pick<Team, "id">): string {
  return `/nhl/teams/${team.id}`;
}
