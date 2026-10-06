"use client";

import type { ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";
import Link from "next/link";
import { gameHref, gameStatusLine, hasScore, tickerGames } from "../../lib/scoreboard-view";
import { useScoreboard } from "./scoreboard-provider";

function Side({ side, scored }: { side: ScoreboardSide; scored: boolean }) {
  return (
    <span className={side.winner ? "font-bold" : undefined}>
      {side.abbreviation}
      {scored && <span className="tabular-nums"> {side.score}</span>}
    </span>
  );
}

function Entry({ game }: { game: ScoreboardGame }) {
  const live = game.status === "live";
  const scored = hasScore(game);
  const status = gameStatusLine(game);
  return (
    <li className="border-border border-r">
      <Link
        href={gameHref(game)}
        data-live={live ? "" : undefined}
        className={`flex items-baseline gap-2 whitespace-nowrap px-3 py-1.5 hover:bg-highlight ${live ? "bg-live-tint" : ""}`}
      >
        <Side side={game.away} scored={scored} />
        <span className="text-foreground/40">
          <span aria-hidden="true">@</span>
          <span className="sr-only">at</span>
        </span>
        <Side side={game.home} scored={scored} />
        <span className={live ? "font-bold text-live" : "text-foreground/50"}>
          {/* The tint says "live" to the eye only. */}
          {live && status !== "live" && <span className="sr-only">live, </span>}
          {status}
        </span>
      </Link>
    </li>
  );
}

/**
 * The score ticker: today's games on one line across the top of every page, each linking to its
 * game. Away then home, the winner in bold, a game in progress tinted. It scrolls sideways inside
 * its own strip; "scores" stays put at its start and leads to `/nhl/live`.
 */
export function ScoreTicker() {
  const { date, games } = useScoreboard();
  // Before the Scoreboard has a slate there is nothing to say, and the strip takes no room.
  if (date == null) return null;
  return (
    <nav aria-label="Scores" className="flex">
      <Link
        href="/nhl/live"
        className="shrink-0 border-rule border-r px-4 py-1.5 font-bold uppercase hover:bg-highlight md:px-6"
      >
        scores
      </Link>
      {games.length === 0 ? (
        <p className="px-3 py-1.5 text-foreground/50">No games today</p>
      ) : (
        // Positioned, so the entries' text for screen readers stays inside the scrolling strip.
        <ul className="relative flex min-w-0 overflow-x-auto [scrollbar-width:none]">
          {tickerGames(games).map((game) => (
            <Entry key={game.id} game={game} />
          ))}
        </ul>
      )}
    </nav>
  );
}
