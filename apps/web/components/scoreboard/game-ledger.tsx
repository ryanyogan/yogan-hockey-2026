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
import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import type { ReactNode } from "react";
import { agateName, statusText } from "../../lib/agate-copy";
import { gameHref, gameStatusLine, gameWhere, hasScore } from "../../lib/scoreboard-view";
import { Link } from "../link";
import { GameStatus } from "./game-status";

function Team({ side }: { side: ScoreboardSide }) {
  return (
    <>
      {/* Its agate name where there is room and its abbreviation on a phone: one is shown. */}
      <span className={side.winner ? "font-strong" : undefined}>
        <span className="sm:hidden">{side.abbreviation}</span>
        <span className="max-sm:hidden">{agateName(side)}</span>
      </span>{" "}
      {/* Beside the team on a wide page; on a phone, where the two do not fit, under it. */}
      {side.record && (
        <LedgerAside className="max-xl:block max-xl:text-small">{side.record}</LedgerAside>
      )}
    </>
  );
}

/**
 * A cell of text: on a phone its first line stays level with its neighbours' first lines, and the
 * row is its two lines and 8px above and below (55px with its rule). Exported, with the score's,
 * for the ledger's placeholder, whose rows are then the same height.
 */
export const GAME_TEXT_CELL = "whitespace-nowrap max-md:py-2 max-md:align-top";

/**
 * A score on a phone starts level with the first line beside it. A finished game's losing score
 * steps back, so the winner's is found first.
 */
export const GAME_SCORE_CELL = "max-md:pt-2! max-md:pl-0 max-md:align-top";
const scoreCell = (lost: boolean) => `${GAME_SCORE_CELL} ${lost ? "text-note" : ""}`;

/** Column widths that are the same in every ledger, so one under another lines up. */
/** Exported for the frame that holds a team's game's place (`team/team-now-frame.tsx`). */
export const FIXED_GAME_COLUMNS = {
  // A phone's 132px holds the longest line under a status, a final's pick and its mark
  // ("WPG 88% Wrong", 123px), which 112px cut off before the mark.
  status: "w-33 sm:w-36",
  team: "sm:w-52",
  score: "w-8 sm:w-14",
  note: "max-xl:hidden",
};

/**
 * Games as agate rows: status, away, home, each team with its record, then the note: the pick,
 * and where the game is played and shown. Each row links to the
 * game's page, a game in progress has its status in the one red, the scores are bold and the
 * winner of a finished game is in bold. No row has a team's mark (agate.md, Decisions). The columns are fixed widths, so one ledger under another lines up.
 *
 * A phone has no room for the last column or for a record beside its team, so there a row has a
 * second line: the pick, or "No pick", in small print under the status, and each record
 * under its team. This detail also stays visible on tablets, where the desktop note can be squeezed out.
 */
export function GameLedger({
  games,
  pick,
}: {
  games: ScoreboardGame[];
  /**
   * The pick for a game, as one line ("TOR 58%", "pick pending"), or nothing. It is drawn in the
   * note column ahead of the venue; on a phone it takes the venue's place under the status.
   */
  pick?: (game: ScoreboardGame) => ReactNode;
}) {
  const widths = FIXED_GAME_COLUMNS;
  return (
    <Ledger className="table-fixed">
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
          const where = gameWhere(game);
          const picked = pick?.(game);
          const hasPick = picked != null && picked !== false;
          const final = game.status === "final";
          return (
            <LedgerRow key={game.id} live={game.status === "live"}>
              <LedgerCell className={GAME_TEXT_CELL}>
                <Link href={gameHref(game)} className={ledgerRowLink}>
                  <span className="sr-only">
                    {game.away.abbreviation} at {game.home.abbreviation},{" "}
                  </span>
                  {game.status === "live" ? (
                    // "End 1st", as a kicker has it: the status line's own first letter is small.
                    <LiveMarker strong className="capitalize">
                      {/* The marker says "live" itself: a game in its warm-up has no more to add. */}
                      {status === "live" ? null : status}
                    </LiveMarker>
                  ) : status == null ? (
                    // Still to be played: the time it starts, in the visitor's own zone.
                    <GameStatus game={game} />
                  ) : (
                    // "Final/OT", "Postponed": as Home's briefs say it.
                    statusText(game)
                  )}
                </Link>
                <LedgerDetail fine className="xl:hidden">
                  {hasPick ? picked : "No pick"}
                </LedgerDetail>
              </LedgerCell>
              <LedgerCell className={GAME_TEXT_CELL}>
                <Team side={game.away} />
              </LedgerCell>
              <LedgerCell tone="score" className={scoreCell(final && !game.away.winner)}>
                {hasScore(game) ? game.away.score : null}
              </LedgerCell>
              <LedgerCell className={GAME_TEXT_CELL}>
                <Team side={game.home} />
              </LedgerCell>
              <LedgerCell tone="score" className={scoreCell(final && !game.home.winner)}>
                {hasScore(game) ? game.home.score : null}
              </LedgerCell>
              {/* `max-w-0`: a long note is cut short, and never widens its column. */}
              <LedgerCell tone="note" className="max-w-0 truncate max-xl:hidden">
                {hasPick && (
                  <span data-slot="game-pick" className="mr-4 font-label">
                    {picked}
                  </span>
                )}
                {!hasPick && <span className="mr-4">No pick</span>}
                <span title={where || undefined} className="text-aside">
                  {where}
                </span>
              </LedgerCell>
            </LedgerRow>
          );
        })}
      </LedgerBody>
    </Ledger>
  );
}
