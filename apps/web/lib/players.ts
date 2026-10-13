import { EspnFetchError, EspnParseError } from "@yogan-hockey/espn";
import {
  PLAYER_SEARCH_LIMIT,
  type PlayerCareer,
  type PlayerGameLog,
  type PlayerProfile,
  type PlayerSearchResult,
} from "@yogan-hockey/schemas";
import { cachedPlayer, cachedPlayerCareer, cachedPlayerGameLog, cachedPlayerSearch } from "./espn";
import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH } from "./player-search";

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
    const players = await cachedPlayerSearch(query);
    return { status: "found", query, players: players.slice(0, PLAYER_SEARCH_LIMIT) };
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

/**
 * A player by the `:id` of his page. Null when there is no such player, which his profile alone
 * says: ESPN's stats sometimes answer 500 for an id it does not know, where the profile answers
 * 404 every time. So a missing profile is a missing player whatever the other two reads did, and
 * with the profile read, a failure of either of them is ESPN failing for a player who exists.
 *
 * The profile's answer is the page's as soon as it is in: a missing player is not kept waiting
 * for his stats, which can take ESPN's ten seconds to fail. The other two reads are asked for at
 * the same moment and are not answered before the profile is, so a failure of theirs that arrives
 * first is never mistaken for his. A read the page does not wait for is still finished: `cached`
 * in `lib/kv-cache.ts` hands each to `waitUntil`, and says what leaving one behind used to cost.
 */
export async function loadPlayer(playerId: string): Promise<Player | null> {
  if (!ESPN_ID.test(playerId)) return null;
  const profileRead = cachedPlayer(playerId);
  // Settled, so that neither rejects unheard when the profile has answered for the page.
  const otherReads = Promise.allSettled([
    cachedPlayerCareer(playerId),
    cachedPlayerGameLog(playerId),
  ]);
  let profile: Player["profile"];
  try {
    profile = await profileRead;
  } catch (error) {
    if (error instanceof EspnFetchError && error.notFound) return null;
    throw error;
  }
  const [career, gameLog] = await otherReads;
  if (career.status === "rejected") throw career.reason;
  if (gameLog.status === "rejected") throw gameLog.reason;
  return { profile, career: career.value, gameLog: gameLog.value };
}
