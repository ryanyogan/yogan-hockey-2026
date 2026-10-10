"use client";

import type { ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";
import { FavoriteMarker } from "@yogan-hockey/ui/components/marker";
import { favoritesFirst, isFavoriteGame } from "../../lib/favorites";
import { gameHref, hasScore, tickerGames } from "../../lib/scoreboard-view";
import { useFavorites } from "../../lib/use-favorites";
import { Link } from "../link";
import { GameStatus } from "./game-status";
import { useScoreboard } from "./scoreboard-provider";

function Side({ side, scored }: { side: ScoreboardSide; scored: boolean }) {
  return (
    <span className={`score-side ${side.winner ? "font-bold" : ""}`}>
      <span>{side.abbreviation}</span>
      {scored && (
        <>
          {" "}
          <b>{side.score}</b>
        </>
      )}
    </span>
  );
}

function Entry({ game, favorite }: { game: ScoreboardGame; favorite: boolean }) {
  const live = game.status === "live";
  const scored = hasScore(game);
  return (
    <Link
      href={gameHref(game)}
      className="score-entry"
      data-live={live ? "" : undefined}
      data-favorite={favorite ? "" : undefined}
    >
      <span className="score-match">
        {favorite && (
          <FavoriteMarker className="score-favorite">
            <span className="sr-only">favorite team, </span>
          </FavoriteMarker>
        )}
        <Side side={game.away} scored={scored} />
        <span className="score-at">
          {" "}
          <span aria-hidden="true">{scored ? "–" : "@"}</span>
          <span className="sr-only">at</span>{" "}
        </span>
        <Side side={game.home} scored={scored} />
      </span>
      <span className="score-status">
        {live && <span className="sr-only">live, </span>}
        <GameStatus game={game} />
      </span>
    </Link>
  );
}

/** Every game stays visible. CSS wraps the slate; no carousel, measurement or extra socket. */
export function ScoreTicker() {
  const { date, games } = useScoreboard();
  const favoriteTeamIds = useFavorites("team").ids;
  const ordered = favoritesFirst(tickerGames(games), favoriteTeamIds);
  if (date == null) return null;
  return (
    <nav aria-label="Scores">
      {ordered.length === 0 ? (
        <p className="score-empty">No games today</p>
      ) : (
        <ul aria-label="All of today's games" className="score-grid">
          {ordered.map((game) => (
            <li key={game.id}>
              <Entry game={game} favorite={isFavoriteGame(game, favoriteTeamIds)} />
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
