import type { ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import { FavoriteMarker, LiveMarker } from "@yogan-hockey/ui/components/marker";
import type { ReactNode } from "react";
import { gameHref, gameStatusLine, gameWhere, hasScore } from "../../lib/scoreboard-view";
import { Link } from "../link";
import { TeamMark } from "../team-mark";
import { GameStatus } from "./game-status";

function Team({
  side,
  favorite,
  scored,
}: {
  side: ScoreboardSide;
  favorite: boolean;
  scored: boolean;
}) {
  return (
    <>
      <span className="game-team-line">
        <TeamMark teamId={side.id} />
        <span className={side.winner ? "font-bold" : "font-semibold"}>{side.abbreviation}</span>
        {favorite && (
          <FavoriteMarker className="text-[10px]">
            <span className="sr-only">favorite team</span>
          </FavoriteMarker>
        )}
        {scored && <span className="team-score">{side.score}</span>}
      </span>
      {side.record && <span className="game-team-record">{side.record}</span>}
    </>
  );
}

/** Aligned game rows share one visible AI-pick column at every width. No probability is invented. */
export function GameLedger({
  games,
  favoriteTeamIds = [],
  pick,
}: {
  games: ScoreboardGame[];
  favoriteTeamIds?: readonly string[];
  /** D1's pick, pending while eligible, or nothing after a failed/unavailable prediction. */
  pick?: (game: ScoreboardGame) => ReactNode;
}) {
  return (
    <Ledger className="game-ledger">
      <LedgerHead>
        <LedgerColumn className="game-status-column">Status</LedgerColumn>
        <LedgerColumn className="game-team-column">Away</LedgerColumn>
        <LedgerColumn className="game-team-column">Home</LedgerColumn>
        <LedgerColumn className="game-pick-column">AI pick</LedgerColumn>
        <LedgerColumn className="game-location">Venue / TV</LedgerColumn>
      </LedgerHead>
      <LedgerBody>
        {games.map((game) => {
          const status = gameStatusLine(game);
          const picked = pick?.(game);
          const hasPick = picked != null && picked !== false;
          const where = gameWhere(game);
          return (
            <LedgerRow key={game.id} live={game.status === "live"} interactive>
              <LedgerCell className="game-status-cell">
                <Link href={gameHref(game)} className={ledgerRowLink}>
                  <span className="sr-only">
                    {game.away.abbreviation} at {game.home.abbreviation},{" "}
                  </span>
                  {game.status === "live" ? (
                    <LiveMarker strong className="text-foreground">
                      {status === "live" ? null : status}
                    </LiveMarker>
                  ) : (
                    <GameStatus game={game} />
                  )}
                </Link>
              </LedgerCell>
              <LedgerCell>
                <Team
                  side={game.away}
                  favorite={favoriteTeamIds.includes(game.away.id)}
                  scored={hasScore(game)}
                />
              </LedgerCell>
              <LedgerCell>
                <Team
                  side={game.home}
                  favorite={favoriteTeamIds.includes(game.home.id)}
                  scored={hasScore(game)}
                />
              </LedgerCell>
              <LedgerCell className="game-pick-cell">
                {hasPick ? (
                  <span data-slot="game-pick">{picked}</span>
                ) : (
                  <span className="text-muted-foreground">No pick</span>
                )}
              </LedgerCell>
              <LedgerCell className="game-location">
                <span title={where || undefined}>{where}</span>
              </LedgerCell>
            </LedgerRow>
          );
        })}
      </LedgerBody>
    </Ledger>
  );
}
