import type { Team } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import Link from "next/link";
import { teamHref } from "./team-name";

/** Every team in the league, by city, each row linking to the team's page. */
export function TeamsLedger({ teams }: { teams: Team[] }) {
  const byCity = teams.toSorted((a, b) => a.name.localeCompare(b.name));
  return (
    <Section>
      <SectionHeader title="Teams" count={`${teams.length} teams`} />
      <Ledger density="compact">
        <LedgerHead>
          <LedgerColumn>abbr</LedgerColumn>
          <LedgerColumn>city</LedgerColumn>
          <LedgerColumn className="w-full">team</LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          {byCity.map((team) => (
            <LedgerRow key={team.id} interactive>
              <LedgerCell tone="aside">{team.abbreviation}</LedgerCell>
              <LedgerCell className="whitespace-nowrap">{team.location}</LedgerCell>
              <LedgerCell className="whitespace-nowrap">
                {/* Named in full ("Toronto Maple Leafs"), since the city sits in its own column. */}
                <Link href={teamHref(team)} aria-label={team.name} className={ledgerRowLink}>
                  {team.shortName}
                </Link>
              </LedgerCell>
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}
