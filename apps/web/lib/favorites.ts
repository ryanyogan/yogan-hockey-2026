import type { ScoreboardGame } from "@yogan-hockey/schemas";

/**
 * Favorites: the players and teams a visitor has marked with a heart. They are kept in the
 * visitor's own browser, as two lists of ids, and nowhere else. Everything here is pure and safe
 * on either side; `use-favorites.ts` is the hook that reads and writes the browser's copy.
 */

/**
 * Where each list is kept in `localStorage`, as a JSON array of ids, oldest first. The players'
 * key and shape are the Parity Reference's own, so favorites made there are read here if the two
 * sites ever share an address.
 */
export const FAVORITE_KEYS = { player: "favorite_players", team: "favorite_teams" } as const;
export type FavoriteKind = keyof typeof FAVORITE_KEYS;

/**
 * The most favorites of one kind a visitor holds. The Parity Reference has no limit; this one is
 * there because every favorite player is three ESPN reads when the list is drawn cold.
 */
export const MAX_FAVORITES = 24;

/** An ESPN id is digits; a player who is not ESPN's (Rylan) has a short name of his own. */
const ID = /^[\w-]{1,64}$/;

function asId(value: unknown): string | null {
  if (typeof value === "number")
    return Number.isSafeInteger(value) && value >= 0 ? `${value}` : null;
  return typeof value === "string" && ID.test(value) ? value : null;
}

/**
 * The ids in a stored value, which is whatever the browser held: written by an older version, by
 * hand or by another site. Anything that is not a list is no favorites, and anything in a list
 * that cannot be an id is left out. Also what a Server Action runs its argument through.
 */
export function readFavoriteIds(stored: unknown): string[] {
  if (!Array.isArray(stored)) return [];
  const ids = new Set<string>();
  for (const value of stored) {
    const id = asId(value);
    if (id !== null) ids.add(id);
    if (ids.size === MAX_FAVORITES) break;
  }
  return [...ids];
}

/** The list with `id` taken out if it was in, and added at the end if it was not. */
export function toggleFavorite(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((each) => each !== id);
  // A full list lets go of its oldest, so a heart always fills when it is pressed.
  return [...ids, id].slice(-MAX_FAVORITES);
}

type GameSides = {
  away: Pick<ScoreboardGame["away"], "id">;
  home: Pick<ScoreboardGame["home"], "id">;
};

/** Whether either side of a game is one of the visitor's favorite teams. */
export function isFavoriteGame(game: GameSides, teamIds: readonly string[]): boolean {
  return teamIds.includes(game.away.id) || teamIds.includes(game.home.id);
}

/**
 * Games with the favorite teams' games first. Each group keeps the order it came in, so a list
 * already sorted by status or start time stays sorted within the favorites and within the rest.
 * It takes any game with two sides: the Scoreboard's, or a full `Game` on the dashboard.
 */
export function favoritesFirst<T extends GameSides>(
  games: readonly T[],
  teamIds: readonly string[],
): T[] {
  if (teamIds.length === 0) return [...games];
  return [
    ...games.filter((game) => isFavoriteGame(game, teamIds)),
    ...games.filter((game) => !isFavoriteGame(game, teamIds)),
  ];
}
