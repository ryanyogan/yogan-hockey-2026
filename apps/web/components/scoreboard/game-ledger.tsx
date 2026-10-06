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
import type { ReactNode } from "react";
import { isFavoriteGame } from "../../lib/favorites";
import { gameHref, gameStatusLine, gameWhere, hasScore } from "../../lib/scoreboard-view";
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

/** Column widths that are the same in every ledger, so one under another lines up. */
const FIXED = {
  status: "w-28 sm:w-36",
  team: "sm:w-52",
  score: "w-10 sm:w-14",
  note: "max-sm:hidden",
};

/**
 * Column widths for a ledger on its own. From `xl` they are the shares the Reference UI's table
 * comes to at 1440 (249, 211 and 62 of 1200px, the note having the other 403).
 */
const FITTED = {
  status: "max-sm:w-28 xl:w-[20.78%]",
  team: "xl:w-[17.61%]",
  score: "max-sm:w-10 xl:w-[5.2%]",
  note: "max-sm:hidden sm:w-full xl:w-auto",
};

/**
 * Games as ledger rows, the Reference UI's "tonight" table: status, away, home, each team with its
 * record, then the note: the favorite-team marker, the pick, and where the game is played and
 * shown. Each row links to the game's page, a game in progress is tinted, and the winner of a
 * finished game is in bold. The columns are fixed widths, so one ledger under another lines up;
 * `fitted` is for a ledger that stands alone.
 *
 * A phone has no room for the last column or for a record beside its team, so there a row has a
 * second line: the pick, or else the venue, in small print under the status, and each record
 * under its team.
 */
export function GameLedger({
  games,
  favoriteTeamIds = [],
  pick,
  fitted = false,
}: {
  games: ScoreboardGame[];
  /**
   * The pick for a game, as one line ("TOR 58%", "pick pending"), or nothing. It is drawn in the
   * note column after the favorite marker; on a phone it takes the venue's place under the status.
   */
  pick?: (game: ScoreboardGame) => ReactNode;
  /**
   * For a ledger that stands alone, the dashboard's: from `sm` up each column is as wide as what
   * is in it and the note has the rest, and on a wide page the columns take the shares of the
   * Reference UI's "tonight" table. Ledgers stacked under one another want the fixed widths.
   */
  fitted?: boolean;
  /**
   * The visitor's favorite teams: a game of theirs says "★ favorite team" in the last column,
   * ahead of the venue, as the Reference UI's note column does. A phone has no room for the
   * words and puts the star beside the favorite team.
   */
  favoriteTeamIds?: readonly string[];
}) {
  const widths = fitted ? FITTED : FIXED;
  return (
    <Ledger className={fitted ? "max-sm:table-fixed" : "table-fixed"}>
      <LedgerHead>
        <LedgerColumn className={widths.status}>status</LedgerColumn>
        <LedgerColumn className={widths.team}>away</LedgerColumn>
        <LedgerColumn numeric className={widths.score} />
        <LedgerColumn className={widths.team}>home</LedgerColumn>
        <LedgerColumn numeric className={widths.score} />
        {/* Takes the rest of a wide page, so a score stays beside its team. */}
        <LedgerColumn className={widths.note}>note</LedgerColumn>
      </LedgerHead>
      <LedgerBody>
        {games.map((game) => {
          const status = gameStatusLine(game);
          const favorite = isFavoriteGame(game, favoriteTeamIds);
          const where = gameWhere(game);
          const picked = pick?.(game);
          const hasPick = picked != null && picked !== false;
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
                  {hasPick ? picked : game.venue}
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
              {/* `max-w-0`: a long note is cut short, and never widens its column. */}
              <LedgerCell tone="note" className="max-w-0 truncate max-sm:hidden">
                {favorite && <FavoriteMarker className="mr-4">favorite team</FavoriteMarker>}
                {hasPick && (
                  <span data-slot="game-pick" className="mr-4">
                    {picked}
                  </span>
                )}
                <span title={where || undefined}>{where}</span>
              </LedgerCell>
            </LedgerRow>
          );
        })}
      </LedgerBody>
    </Ledger>
  );
}
