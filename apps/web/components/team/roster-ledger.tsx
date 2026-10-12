import type { RosterPlayer } from "@yogan-hockey/schemas";
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
import { playerHref } from "../../lib/roster";
import { Link } from "../link";
import { EmptyLedger } from "./empty-ledger";

/**
 * A team's players, each row linking to the player's page. The rows are drawn in the order given
 * and counted as given: the page sorts them (`sortRoster`), and a player added to the list (#46)
 * is a row like any other.
 */
export function RosterLedger({ players }: { players: readonly RosterPlayer[] }) {
  return (
    <Section>
      <SectionHeader
        title="Roster"
        count={players.length === 1 ? "1 player" : `${players.length} players`}
      />
      {players.length === 0 ? (
        <EmptyLedger>No roster yet this season.</EmptyLedger>
      ) : (
        <Ledger>
          <LedgerHead>
            {/* Wide enough for two digits, so the names line up. */}
            <LedgerColumn numeric className="min-w-8">
              #
            </LedgerColumn>
            <LedgerColumn className="w-full">player</LedgerColumn>
            <LedgerColumn>pos</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            {players.map((player) => (
              <LedgerRow key={player.id}>
                <LedgerCell numeric tone="aside">
                  {player.jersey ?? "-"}
                </LedgerCell>
                <LedgerCell className="whitespace-nowrap">
                  <Link href={playerHref(player)} className={ledgerRowLink}>
                    {player.name}
                  </Link>
                </LedgerCell>
                <LedgerCell>{player.position}</LedgerCell>
              </LedgerRow>
            ))}
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}
