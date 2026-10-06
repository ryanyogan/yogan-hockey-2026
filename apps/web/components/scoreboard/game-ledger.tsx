import type { ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";
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
import { FavoriteMarker, LiveMarker } from "@yogan-hockey/ui/components/marker";
import Link from "next/link";
import { isFavoriteGame } from "../../lib/favorites";
import { gameHref, gameStatusLine, hasScore } from "../../lib/scoreboard-view";
import { GameStatus } from "./game-status";

function Team({ side, favorite }: { side: ScoreboardSide; favorite: boolean }) {
  return (
    <>
      <span className={side.winner ? "font-bold" : undefined}>{side.abbreviation}</span>{" "}
      {/* A phone has no last column to say "favorite team" in: the star goes by the team. */}
      {favorite && (
        <FavoriteMarker className="text-foreground/70 sm:hidden">
          <span className="sr-only">favorite team</span>
        </FavoriteMarker>
      )}
      {/* Beside the team on a wide page; on a phone, where the two do not fit, under it. */}
      {side.record && <LedgerAside className="max-sm:block">{side.record}</LedgerAside>}
    </>
  );
}

/** A cell of text: on a phone its first line stays level with its neighbours' first lines. */
const TEXT_CELL = "whitespace-nowrap max-sm:align-top";

/**
 * Games as ledger rows, the Reference UI's "tonight" table: status, away, home, each team with its
 * record, then the venue. Each row links to the game's page, a game in progress is tinted, and the
 * winner of a finished game is in bold. The columns are fixed widths, so one ledger under another
 * lines up.
 *
 * A phone has no room for the last column or for a record beside its team, so there a row has a
 * second line: the venue in small print under the status, each record under its team.
 */
export function GameLedger({
  games,
  favoriteTeamIds = [],
}: {
  games: ScoreboardGame[];
  /**
   * The visitor's favorite teams: a game of theirs says "★ favorite team" in the last column,
   * ahead of the venue, as the Reference UI's note column does. A phone has no room for the
   * words and puts the star beside the favorite team.
   */
  favoriteTeamIds?: readonly string[];
}) {
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
          const favorite = isFavoriteGame(game, favoriteTeamIds);
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
                    <GameStatus game={game} />
                  )}
                </Link>
                <LedgerDetail fine className="sm:hidden">
                  {game.venue}
                </LedgerDetail>
              </LedgerCell>
              <LedgerCell className={TEXT_CELL}>
                <Team side={game.away} favorite={favoriteTeamIds.includes(game.away.id)} />
              </LedgerCell>
              <LedgerCell tone="score">{hasScore(game) ? game.away.score : null}</LedgerCell>
              <LedgerCell className={TEXT_CELL}>
                <Team side={game.home} favorite={favoriteTeamIds.includes(game.home.id)} />
              </LedgerCell>
              <LedgerCell tone="score">{hasScore(game) ? game.home.score : null}</LedgerCell>
              <LedgerCell tone="note" className="truncate max-sm:hidden">
                {favorite && <FavoriteMarker className="mr-4">favorite team</FavoriteMarker>}
                {game.venue}
              </LedgerCell>
            </LedgerRow>
          );
        })}
      </LedgerBody>
    </Ledger>
  );
}
