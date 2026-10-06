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
      {/* Beside the team on a wide page; on a phone, where the two do not fit, under it. */}
      {side.record && <LedgerAside className="max-sm:block">{side.record}</LedgerAside>}
    </>
  );
}

/** A cell of text: on a phone its first line stays level with its neighbours' first lines. */
const TEXT_CELL = "whitespace-nowrap max-sm:align-top";
/**
 * The venue as a phone shows it: small, under the status, on two lines where one is too short for
 * it. It keeps the room of two lines either way, so every row is the same height.
 */
const PHONE_VENUE =
  "line-clamp-2 h-6 whitespace-normal text-[10px] text-foreground/50 leading-3 sm:hidden";

/**
 * Games as ledger rows, the Reference UI's "tonight" table: status, away, home, each team with its
 * record, then the venue. Each row links to the game's page, a game in progress is tinted, and the
 * winner of a finished game is in bold. The columns are fixed widths, so one ledger under another
 * lines up.
 *
 * A phone has no room for the last column or for a record beside its team, so there a row has a
 * second line: the venue under the status, each record under its team.
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
        <LedgerColumn className="max-sm:hidden">venue</LedgerColumn>
      </LedgerHead>
      <LedgerBody>
        {games.map((game) => {
          const status = gameStatusLine(game);
          return (
            <LedgerRow key={game.id} live={game.status === "live"} interactive>
              <LedgerCell className={TEXT_CELL}>
                <Link href={gameHref(game)} className={ledgerRowLink}>
                  <span className="sr-only">
                    {game.away.abbreviation} at {game.home.abbreviation},{" "}
                  </span>
                  {game.status === "live" ? (
                    <LiveMarker strong className="text-foreground underline">
                      {/* The marker says "live" itself: a game in its warm-up has no more to add. */}
                      {status === "live" ? null : status}
                    </LiveMarker>
                  ) : (
                    status
                  )}
                </Link>
                {game.venue && <div className={PHONE_VENUE}>{game.venue}</div>}
              </LedgerCell>
              <LedgerCell className={TEXT_CELL}>
                <Team side={game.away} />
              </LedgerCell>
              <LedgerCell tone="score">{hasScore(game) ? game.away.score : null}</LedgerCell>
              <LedgerCell className={TEXT_CELL}>
                <Team side={game.home} />
              </LedgerCell>
              <LedgerCell tone="score">{hasScore(game) ? game.home.score : null}</LedgerCell>
              <LedgerCell tone="note" className="truncate max-sm:hidden">
                {game.venue}
              </LedgerCell>
            </LedgerRow>
          );
        })}
      </LedgerBody>
    </Ledger>
  );
}
