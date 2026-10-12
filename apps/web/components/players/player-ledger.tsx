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
import { Link } from "../link";

/** A list of players, each row leading to his page: search results. It has no state. */
export function PlayerLedger({ players }: { players: readonly PlayerSearchResult[] }) {
  return (
    <Ledger>
      <LedgerHead>
        <LedgerColumn>player</LedgerColumn>
        <LedgerColumn>pos</LedgerColumn>
        <LedgerColumn>team</LedgerColumn>
      </LedgerHead>
      <LedgerBody>
        {players.map((player) => (
          <LedgerRow key={player.id}>
            <LedgerCell>
              <Link href={`/players/${player.id}`} className={`font-strong ${ledgerRowLink}`}>
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
          </LedgerRow>
        ))}
      </LedgerBody>
    </Ledger>
  );
}
