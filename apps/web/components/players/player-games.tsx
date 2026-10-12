import { getRouteApi } from "@tanstack/react-router";
import { GameLogSection } from "./player-sections";

const playerRoute = getRouteApi("/players/$id");

/** How many games the default tab shows. */
const LATEST_GAMES = 10;

/** A player's games, from what his route read: the latest of them, or `all`. */
export function PlayerGames({ all = false }: { all?: boolean }) {
  const { profile, log } = playerRoute.useLoaderData();
  if (!log) return null;
  const { id } = profile;
  return (
    <GameLogSection
      log={all ? log : { ...log, rows: log.rows.slice(0, LATEST_GAMES) }}
      allHref={`/players/${id}/games#games`}
      latestHref={all ? `/players/${id}#games` : undefined}
    />
  );
}
