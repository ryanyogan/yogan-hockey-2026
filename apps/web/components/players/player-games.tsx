import { getRouteApi } from "@tanstack/react-router";
import { GameLogSection } from "./player-sections";

const player = getRouteApi("/players/$id");

/** How many games the default tab shows. */
const LATEST = 10;

/** A player's games, from what his route read: the latest of them, or `all`. */
export function PlayerGames({ all = false }: { all?: boolean }) {
  const { profile, log } = player.useLoaderData();
  if (!log) return null;
  const { id } = profile;
  return (
    <GameLogSection
      log={all ? log : { ...log, rows: log.rows.slice(0, LATEST) }}
      allHref={`/players/${id}/games#games`}
      latestHref={all ? `/players/${id}#games` : undefined}
    />
  );
}
