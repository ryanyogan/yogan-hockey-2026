"use client";

import { DASHBOARD_FAVORITES, gamePlayingNow } from "../../lib/dashboard";
import type { FavoritePlayer } from "../../lib/favorite-players";
import { gameHref } from "../../lib/scoreboard-view";
import { FavoriteHeart } from "../favorites/favorite-heart";
import { seasonLine } from "../favorites/favorite-players-ledger";
import { useFavoritePlayers } from "../favorites/use-favorite-players";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { emptyProse } from "../story/type";
import { label, link, smallMore } from "./agate";

const prose = `mt-2.5 ${emptyProse} normal-nums`;

/** A favorite as an agate row: his name and club, his season under them, his heart at the right. */
function Favorite({ player }: { player: FavoritePlayer }) {
  const { games } = useScoreboard();
  const game = gamePlayingNow(player.team?.id, games);
  const season = seasonLine(player);
  return (
    <li
      data-slot="favorite"
      className="flex items-center gap-3 border-border border-b border-dotted py-[6px] last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[16px]">
          <Link
            href={`/players/${player.id}`}
            className={`${link} tap-target font-label hover:underline`}
          >
            {player.name}
          </Link>{" "}
          {player.team && (
            <abbr title={player.team.name} className="text-aside no-underline">
              <span aria-hidden="true">{player.team.abbreviation}</span>
              <span className="sr-only">{player.team.name}</span>
            </abbr>
          )}
        </p>
        {season && <p className="text-[14px] text-aside">{season}</p>}
      </div>
      {game && (
        <Link
          href={gameHref(game)}
          aria-label={`${player.name}'s game, live now`}
          className={`${link} tap-target font-label text-live text-tag uppercase tracking-mark`}
        >
          Live
        </Link>
      )}
      <FavoriteHeart kind="player" id={player.id} name={player.name} className="mr-2 flex-none" />
    </li>
  );
}

/**
 * Home's Favorites: the visitor's first four favorite players in agate rows, each marked "Live"
 * while his team is in a game in progress, the mark leading to that game. The ids are the
 * browser's, so the server draws one quiet line and the rows take its place once they are read.
 */
export function DashboardFavorites() {
  const { status, players, unavailable } = useFavoritePlayers(DASHBOARD_FAVORITES);
  return (
    <section
      aria-labelledby="favorites-heading"
      aria-busy={status === "waiting"}
      data-slot="favorites"
      className="relative max-md:order-3"
    >
      <div className="flex items-center justify-between border-rule border-b">
        <h2 id="favorites-heading" className={label}>
          Favorites
        </h2>
        <Link href="/players" className={smallMore}>
          All players
        </Link>
      </div>
      {status === "listed" ? (
        <ul>
          {players.map((player) => (
            <Favorite key={player.id} player={player} />
          ))}
        </ul>
      ) : status === "waiting" ? (
        <p className={prose}>Reading your favorites.</p>
      ) : unavailable ? null : (
        <p className={prose}>
          No favorite players yet.{" "}
          <Link
            href="/players"
            className={`${link} tap-target text-foreground underline underline-offset-2 hover:text-label`}
          >
            Find a player
          </Link>{" "}
          and press his heart to keep him here.
        </p>
      )}
      {unavailable && (
        // Favorites that are still his: they are asked for again when the page is next opened.
        <p role="status" className={prose}>
          {status === "listed" ? "Some favorites" : "Your favorites"} could not be read just now.
        </p>
      )}
    </section>
  );
}
