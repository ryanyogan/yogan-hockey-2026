import type { PlayerSearchResult } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerAside,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A list of players, each row leading to his page: search results now, and the favorite players
 * of #45. It has no state, so a server component and a client component can both render it.
 *
 * `action` draws something at the end of each row, which is where #45's heart goes. The cell it
 * sits in is raised above the row's link, so a button there takes its own clicks.
 */
export function PlayerLedger({
  players,
  action,
}: {
  players: readonly PlayerSearchResult[];
  action?: (player: PlayerSearchResult) => ReactNode;
}) {
  return (
    <Ledger>
      <LedgerHead>
        <LedgerColumn>player</LedgerColumn>
        <LedgerColumn>pos</LedgerColumn>
        <LedgerColumn>team</LedgerColumn>
        {action ? <LedgerColumn /> : null}
      </LedgerHead>
      <LedgerBody>
        {players.map((player) => (
          <LedgerRow key={player.id} interactive>
            <LedgerCell>
              <Link href={`/players/${player.id}`} prefetch={false} className={ledgerRowLink}>
                {player.name}
              </Link>
              {player.jersey ? <LedgerAside> #{player.jersey}</LedgerAside> : null}
            </LedgerCell>
            <LedgerCell>{player.position}</LedgerCell>
            <LedgerCell>
              {player.team?.abbreviation}
              {player.team ? (
                <LedgerAside className="max-sm:hidden"> {player.team.name}</LedgerAside>
              ) : null}
            </LedgerCell>
            {action ? (
              <LedgerCell numeric className="relative z-10">
                {action(player)}
              </LedgerCell>
            ) : null}
          </LedgerRow>
        ))}
      </LedgerBody>
    </Ledger>
  );
}
