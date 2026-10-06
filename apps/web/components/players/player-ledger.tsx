import type { PlayerSearchResult } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerAside,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerDetail,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import type { ReactNode } from "react";
import { Link } from "../link";
import { TeamMark } from "../team-mark";

/**
 * A list of players, each row leading to his page: search results and favorite players. It has
 * no state, so a server component and a client component can both render it.
 *
 * `action` draws something at the end of each row: the heart that makes him a favorite. The cell it
 * sits in is raised above the row's link, so a button there takes its own clicks.
 */
export function PlayerLedger<P extends PlayerSearchResult>({
  players,
  line,
  action,
  compact = false,
}: {
  players: readonly P[];
  /**
   * Half a page wide, as on the dashboard, in the Reference UI's four columns: no sweater number,
   * and the team is its abbreviation (its name to a screen reader and on hover) with the position
   * beside it in place of a column.
   */
  compact?: boolean;
  /** A "season" column between the team and the action: a favorite player's figures. */
  line?: (player: P) => ReactNode;
  action?: (player: P) => ReactNode;
}) {
  // On a phone the season line goes under the name and needs the position's room: a goalie's
  // line ("1 GP · 1 W · 1.03 GAA · .963 SV%") is 250px, and says he is a goalie.
  const narrow = line ? "max-sm:hidden" : undefined;
  return (
    <Ledger>
      <LedgerHead>
        <LedgerColumn>player</LedgerColumn>
        {compact ? null : <LedgerColumn className={narrow}>pos</LedgerColumn>}
        <LedgerColumn>team</LedgerColumn>
        {line ? <LedgerColumn className="max-sm:hidden">season</LedgerColumn> : null}
        {action ? <LedgerColumn /> : null}
      </LedgerHead>
      <LedgerBody>
        {players.map((player) => (
          <LedgerRow key={player.id} interactive>
            <LedgerCell>
              <Link href={`/players/${player.id}`} className={ledgerRowLink}>
                {player.name}
              </Link>
              {player.jersey && !compact ? <LedgerAside> #{player.jersey}</LedgerAside> : null}
              {/* A phone has no room for the column, so the line goes under his name. */}
              {line ? (
                <LedgerDetail className={compact ? "sm:hidden" : "whitespace-nowrap sm:hidden"}>
                  {line(player)}
                </LedgerDetail>
              ) : null}
            </LedgerCell>
            {compact ? null : <LedgerCell className={narrow}>{player.position}</LedgerCell>}
            <LedgerCell className={compact ? "whitespace-nowrap" : undefined}>
              <TeamMark teamId={player.team?.id} />
              {compact && player.team ? (
                // The abbreviation is what is drawn; the team's name is what it says.
                <abbr title={player.team.name} className="no-underline">
                  <span aria-hidden="true">{player.team.abbreviation}</span>
                  <span className="sr-only">{player.team.name}</span>
                </abbr>
              ) : (
                player.team?.abbreviation
              )}
              {compact ? (
                <LedgerAside> {player.position}</LedgerAside>
              ) : player.team ? (
                <LedgerAside className="max-sm:hidden"> {player.team.name}</LedgerAside>
              ) : null}
            </LedgerCell>
            {line ? (
              <LedgerCell tone="note" className="whitespace-nowrap max-sm:hidden">
                {line(player)}
              </LedgerCell>
            ) : null}
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
