import type { ReactNode } from "react";
import type { FavoritePlayer } from "../../lib/favorite-players";
import { PlayerLedger } from "../players/player-ledger";
import { FavoriteHeart } from "./favorite-heart";

/** "3 GP · 1 G · 0 A · 1 PTS", the Reference UI's season line. Nothing for a player without one. */
export const seasonLine = (player: FavoritePlayer) =>
  player.season.map((stat) => `${stat.value} ${stat.label}`).join(" · ");

/**
 * Favorite players as ledger rows: name, position, team, the season line and a heart that takes
 * the row away. `note` is drawn before each heart, which is where the dashboard's "live" goes.
 */
export function FavoritePlayersLedger({
  players,
  note,
  compact,
}: {
  players: readonly FavoritePlayer[];
  /** Half a page wide, as on the dashboard: see `PlayerLedger`. */
  compact?: boolean;
  note?: (player: FavoritePlayer) => ReactNode;
}) {
  return (
    <PlayerLedger
      players={players}
      compact={compact}
      line={seasonLine}
      action={(player) => (
        <span className="inline-flex items-baseline gap-4 whitespace-nowrap">
          {note?.(player)}
          <FavoriteHeart kind="player" id={player.id} name={player.name} />
        </span>
      )}
    />
  );
}
