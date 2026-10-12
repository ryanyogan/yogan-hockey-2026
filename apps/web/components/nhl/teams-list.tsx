import type { Team } from "@yogan-hockey/schemas";
import { ledgerRowLink } from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { Link } from "../link";
import { teamHref } from "./team-name";

/**
 * Every team in the league, by name, each linking to the team's page: an agate list set as the
 * prototype's briefs are (`.brief`), a name in 16px semibold over a dotted rule with the team's
 * abbreviation stepping back at the end of its line. It runs in as many columns as fit, read
 * down each, and no row has a mark (agate.md, Decisions).
 */
export function TeamsList({ teams }: { teams: Team[] }) {
  const byName = teams.toSorted((a, b) => a.name.localeCompare(b.name));
  return (
    <Section aria-label="Teams">
      <SectionHeader title="National Hockey League" count={`${teams.length} teams`} />
      <ul className="columns-[280px] gap-x-8">
        {byName.map((team) => (
          <li
            key={team.id}
            className="relative flex break-inside-avoid items-center justify-between gap-3 border-border border-b border-dotted py-[9px] hover:bg-highlight max-md:min-h-11"
          >
            {/* The link is the whole row, as a ledger's row link is. */}
            <Link href={teamHref(team)} className={`font-label text-score ${ledgerRowLink}`}>
              {team.name}
            </Link>
            <span className="text-aside text-small">{team.abbreviation}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
