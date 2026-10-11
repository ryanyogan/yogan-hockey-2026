import { pageNotFound } from "../../lib/page-not-found";
import { playerOf } from "../../lib/player-route";
import { gameLogView } from "../../lib/player-view";
import { GameLogSection } from "./player-sections";

export async function PlayerGames({ id, all = false }: { id: string; all?: boolean }) {
  const player = await playerOf(id);
  if (!player) pageNotFound();
  const log = gameLogView(player.gameLog, all ? Number.POSITIVE_INFINITY : 10);
  if (!log) return null;
  return (
    <GameLogSection
      log={log}
      allHref={`/players/${id}/games#games`}
      latestHref={all ? `/players/${id}#games` : undefined}
    />
  );
}
