import type { PlayerSearchResult } from "@yogan-hockey/schemas";
import { readFavoriteIds } from "./favorites";
import { seasonView } from "./player-view";
import { loadPlayer, type Player } from "./players";

/**
 * Favorite players, resolved: the browser holds ids, and this turns them into what a list shows.
 * It reads through `loadPlayer`, the players pages' own cached read, so a player who is not
 * ESPN's (Rylan) is found here as he is there. Server only: a client component takes the types.
 */

/** One figure of a season line: "GP" and "3". */
export type FavoriteStat = { label: string; value: string };

/** A favorite player as a list shows him: a search result's fields, and his season so far. */
export type FavoritePlayer = PlayerSearchResult & {
  /** Up to four figures, in order. Empty when he has no season to show. */
  season: FavoriteStat[];
};

export type FavoritePlayers = {
  /** In the order the ids were given, without the ones that are nobody's. */
  players: FavoritePlayer[];
  /** Some player could not be read just now (ESPN is down), so the list may be short. */
  unavailable: boolean;
};

const SKATER_LINE = ["GP", "G", "A", "PTS"];
const GOALIE_LINE = ["GP", "W", "GAA", "SV%"];

function favoritePlayer({ profile, career, gameLog }: Player): FavoritePlayer {
  const stats = seasonView(profile, career, gameLog)?.stats ?? [];
  const wanted = profile.position === "G" ? GOALIE_LINE : SKATER_LINE;
  const { team } = profile;
  return {
    id: profile.id,
    name: profile.name,
    jersey: profile.jersey,
    position: profile.position,
    headshot: profile.headshot,
    team: team && { id: team.id, abbreviation: team.abbreviation, name: team.name },
    season: wanted.flatMap((label) => {
      const stat = stats.find((candidate) => candidate.label === label);
      return stat ? [{ label, value: stat.value }] : [];
    }),
  };
}

/**
 * The players behind a visitor's favorite ids. `ids` is whatever the browser sent, read as a
 * stored list is. An id that is nobody's is skipped silently, and so is one whose read fails,
 * which `unavailable` reports: the visitor's list must never end in an error page.
 */
export async function loadFavoritePlayers(ids: unknown): Promise<FavoritePlayers> {
  let unavailable = false;
  const loaded = await Promise.all(
    readFavoriteIds(ids).map(async (id) => {
      try {
        return await loadPlayer(id);
      } catch (error) {
        console.error(error);
        unavailable = true;
        return null;
      }
    }),
  );
  return {
    players: loaded.flatMap((player) => (player ? [favoritePlayer(player)] : [])),
    unavailable,
  };
}
