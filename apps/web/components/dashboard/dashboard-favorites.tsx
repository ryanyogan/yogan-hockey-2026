"use client";

import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { DASHBOARD_FAVORITES, gamePlayingNow } from "../../lib/dashboard";
import type { FavoritePlayer } from "../../lib/favorite-players";
import { gameHref } from "../../lib/scoreboard-view";
import { FavoritePlayersLedger } from "../favorites/favorite-players-ledger";
import { useFavoritePlayers } from "../favorites/use-favorite-players";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { EmptyLedger } from "../team/empty-ledger";
import { headerLink } from "./header-link";

/**
 * The dashboard's Favorites block: the visitor's first four favorite players, each marked "live"
 * while his team is in a game in progress, the mark leading to that game. The ids are the
 * browser's, so the server draws one quiet line and the rows take its place once they are read.
 */
export function DashboardFavorites() {
  const { status, players, unavailable } = useFavoritePlayers(DASHBOARD_FAVORITES);
  const { games } = useScoreboard();

  const live = (player: FavoritePlayer) => {
    const game = gamePlayingNow(player.team?.id, games);
    return game ? (
      <Link href={gameHref(game)} aria-label={`${player.name}'s game, live now`}>
        <LiveMarker />
      </Link>
    ) : null;
  };

  return (
    <Section aria-label="Favorites" aria-busy={status === "waiting"}>
      <SectionHeader title="Favorites">
        <Link href="/players" className={headerLink}>
          all players
        </Link>
      </SectionHeader>
      {status === "listed" ? (
        <FavoritePlayersLedger compact players={players} note={live} />
      ) : status === "waiting" ? (
        <EmptyLedger>Reading your favorites.</EmptyLedger>
      ) : unavailable ? null : (
        <EmptyLedger>
          No favorite players yet.{" "}
          <Link href="/players" className="underline">
            Find a player
          </Link>{" "}
          and press his heart to keep him here.
        </EmptyLedger>
      )}
      {unavailable && (
        // Favorites that are still his: they are asked for again when the page is next opened.
        <EmptyLedger role="status">
          {status === "listed" ? "Some favorites" : "Your favorites"} could not be read just now.
        </EmptyLedger>
      )}
    </Section>
  );
}
