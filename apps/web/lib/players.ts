import { EspnFetchError, EspnParseError } from "@yogan-hockey/espn";
import type {
  PlayerCareer,
  PlayerGameLog,
  PlayerProfile,
  PlayerSearchResult,
} from "@yogan-hockey/schemas";
import { cachedPlayer, cachedPlayerCareer, cachedPlayerGameLog, cachedPlayerSearch } from "./espn";
import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH } from "./player-search";

/**
 * Where the players pages get their players. The search page, its Server Action and the player
 * page all read through here, so a player who is not ESPN's (the fictional Rylan Yogan of #46)
 * is added in this one file: ahead of ESPN's results in `findPlayers`, and by id in `loadPlayer`.
 */

/**
 * The answer to a search. `idle`: the query is too short to search for. `unavailable`: ESPN could
 * not be asked, which the page says in words; the visitor's typing must never end in an error page.
 */
export type PlayerSearch = {
  status: "idle" | "found" | "unavailable";
  /** The query as searched: trimmed, and no longer than a name. */
  query: string;
  players: PlayerSearchResult[];
};

export async function findPlayers(rawQuery: string): Promise<PlayerSearch> {
  const query = rawQuery.trim().slice(0, MAX_SEARCH_LENGTH);
  if (query.length < MIN_SEARCH_LENGTH) return { status: "idle", query, players: [] };
  try {
    return { status: "found", query, players: await cachedPlayerSearch(query) };
  } catch (error) {
    // Down, or answering in a shape this site no longer reads: either way there is no search.
    if (!(error instanceof EspnFetchError || error instanceof EspnParseError)) throw error;
    console.error(error);
    return { status: "unavailable", query, players: [] };
  }
}

/** Everything a player page shows: three ESPN reads, cached together under `player:{id}`. */
export type Player = {
  profile: PlayerProfile;
  career: PlayerCareer;
  gameLog: PlayerGameLog;
};

/** ESPN's athlete ids are digits. Anything else is not asked for, and not cached. */
const ESPN_ID = /^\d{1,12}$/;

/** A player by the `:id` of his page. Null when there is no such player. */
export async function loadPlayer(playerId: string): Promise<Player | null> {
  if (!ESPN_ID.test(playerId)) return null;
  try {
    const [profile, career, gameLog] = await Promise.all([
      cachedPlayer(playerId),
      cachedPlayerCareer(playerId),
      cachedPlayerGameLog(playerId),
    ]);
    return { profile, career, gameLog };
  } catch (error) {
    if (error instanceof EspnFetchError && error.notFound) return null;
    throw error;
  }
}
