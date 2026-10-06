import type { Team } from "@yogan-hockey/schemas";

/** A team's page. */
export function teamHref(team: Pick<Team, "id">): string {
  return `/nhl/teams/${team.id}`;
}

/**
 * A team as a ledger names it: its full name where there is room, its abbreviation on a phone.
 * Only one of the two is ever shown, or read out.
 */
export function TeamName({ team }: { team: Pick<Team, "name" | "abbreviation"> }) {
  return (
    <>
      <span className="sm:hidden">{team.abbreviation}</span>
      <span className="hidden sm:inline">{team.name}</span>
    </>
  );
}
