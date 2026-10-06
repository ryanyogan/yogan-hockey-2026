import type { ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";
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
import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import Link from "next/link";
import { gameHref, gameStatusLine, hasScore } from "../../lib/scoreboard-view";

function Team({ side }: { side: ScoreboardSide }) {
  return (
    <>
      <span className={side.winner ? "font-bold" : undefined}>{side.abbreviation}</span>{" "}
      <LedgerAside className="max-sm:hidden">{side.shortName}</LedgerAside>
    </>
  );
}

/**
 * Games as ledger rows, the Reference UI's "tonight" table: status, away, home. Each row links to
 * the game's page, a game in progress is tinted, and the winner of a finished game is in bold.
 * The columns are fixed widths, so one ledger under another lines up.
 */
export function GameLedger({ games }: { games: ScoreboardGame[] }) {
  return (
    <Ledger className="table-fixed">
      <LedgerHead>
        <LedgerColumn className="w-28 sm:w-36">status</LedgerColumn>
        <LedgerColumn className="sm:w-52">away</LedgerColumn>
        <LedgerColumn numeric className="w-10 sm:w-14" />
        <LedgerColumn className="sm:w-52">home</LedgerColumn>
        <LedgerColumn numeric className="w-10 sm:w-14" />
        {/* Takes the rest of a wide page, so a score stays beside its team. */}
        <LedgerColumn className="max-sm:hidden" />
      </LedgerHead>
      <LedgerBody>
        {games.map((game) => {
          const status = gameStatusLine(game);
          return (
            <LedgerRow key={game.id} live={game.status === "live"} interactive>
              <LedgerCell className="whitespace-nowrap">
                <Link href={gameHref(game)} className={ledgerRowLink}>
                  <span className="sr-only">
                    {game.away.abbreviation} at {game.home.abbreviation},{" "}
                  </span>
                  {game.status === "live" ? (
                    <LiveMarker strong className="text-foreground underline">
                      {status}
                    </LiveMarker>
                  ) : (
                    status
                  )}
                </Link>
              </LedgerCell>
              <LedgerCell>
                <Team side={game.away} />
              </LedgerCell>
              <LedgerCell tone="score">{hasScore(game) ? game.away.score : null}</LedgerCell>
              <LedgerCell>
                <Team side={game.home} />
              </LedgerCell>
              <LedgerCell tone="score">{hasScore(game) ? game.home.score : null}</LedgerCell>
              <LedgerCell className="max-sm:hidden" />
            </LedgerRow>
          );
        })}
      </LedgerBody>
    </Ledger>
  );
}
