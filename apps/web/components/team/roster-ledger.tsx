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
import Link from "next/link";
import type { ReactNode } from "react";
import { playerHref } from "../../lib/roster";

/**
 * A team's players, each row linking to the player's page. The rows are drawn in the order given
 * and counted as given: the page sorts them (`sortRoster`), and a player added to the list (#46)
 * is a row like any other.
 */
export function RosterLedger({
  players,
  action,
}: {
  players: readonly RosterPlayer[];
  /**
   * Drawn at the end of each row: the heart that makes the player a favorite (#45). The row's
   * link covers the whole row, so a button here needs `relative` to sit above it.
   */
  action?: (player: RosterPlayer) => ReactNode;
}) {
  return (
    <Section>
      <SectionHeader
        title="Roster"
        count={players.length === 1 ? "1 player" : `${players.length} players`}
      />
      {players.length === 0 ? (
        <p className="border-foreground/20 border-t px-2 py-1.5 text-foreground/70">
          No roster yet this season.
        </p>
      ) : (
        <Ledger density="compact">
          <LedgerHead>
            {/* Wide enough for two digits, so the names line up. */}
            <LedgerColumn numeric className="min-w-8">
              #
            </LedgerColumn>
            <LedgerColumn className="w-full">player</LedgerColumn>
            <LedgerColumn>pos</LedgerColumn>
            {action && <LedgerColumn />}
          </LedgerHead>
          <LedgerBody>
            {players.map((player) => (
              <LedgerRow key={player.id} interactive>
                <LedgerCell numeric tone="aside">
                  {player.jersey ?? "-"}
                </LedgerCell>
                <LedgerCell className="whitespace-nowrap">
                  <Link href={playerHref(player)} className={ledgerRowLink}>
                    {player.name}
                  </Link>
                </LedgerCell>
                <LedgerCell>{player.position}</LedgerCell>
                {action && <LedgerCell className="py-0!">{action(player)}</LedgerCell>}
              </LedgerRow>
            ))}
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}
