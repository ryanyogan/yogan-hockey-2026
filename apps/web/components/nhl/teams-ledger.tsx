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
import { Link } from "../link";
import { teamHref } from "./team-name";

/** Every team in the league, by name, each row linking to the team's page. */
export function TeamsLedger({ teams }: { teams: Team[] }) {
  const byName = teams.toSorted((a, b) => a.name.localeCompare(b.name));
  return (
    <Section>
      <SectionHeader title="Teams" count={`${teams.length} teams`} />
      <Ledger density="compact">
        <LedgerHead>
          <LedgerColumn>abbr</LedgerColumn>
          <LedgerColumn className="w-full">team</LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          {byName.map((team) => (
            <LedgerRow key={team.id} interactive>
              <LedgerCell tone="aside">{team.abbreviation}</LedgerCell>
              <LedgerCell className="whitespace-nowrap">
                <Link href={teamHref(team)} className={ledgerRowLink}>
                  {team.name}
                </Link>
              </LedgerCell>
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}
