import { env, waitUntil } from "cloudflare:workers";
import { type Cache, type CacheEntry, cachified, totalTtl } from "@epic-web/cachified";

/**
 * The site's one cache of what it reads from elsewhere: KV, through `@epic-web/cachified`.
 *
 * A read inside its time limit is answered from KV. One past it is answered from KV all the same,
 * at once, and read again behind the answer for whoever asks next, so no visitor waits on ESPN
 * for a page somebody has opened before, or is shown its failure. A key that was never read, or
 * has been forgotten, is read before it is answered, and a failure of that read is the caller's.
 *
 * Nothing is tagged. What a result makes stale is a fixed set of keys, which `forget` deletes.
 *
 * KV is not exact: a location that has read a key may go on answering what it read for up to a
 * minute after another location wrote or deleted it.
 */

const SECOND = 1000;
const DAY = 24 * 60 * 60;

/**
 * How long past its time limit an entry may still be answered, in seconds. Nothing is kept for
 * ever: a search nobody repeats, or a player long retired, leaves KV by itself.
 */
const STALE_FOR = 30 * DAY;

/** KV refuses an entry asked to expire sooner than this, in seconds. */
const KV_SHORTEST_LIFE = 60;

/** cachified's cache, kept in the Worker's KV namespace. The adapter is the site's own. */
const kv: Cache = {
  name: "KV",
  get: (key) => env.CACHE.get<CacheEntry>(key, "json"),
  set: (key, entry) => {
    const life = Math.ceil(totalTtl(entry.metadata) / SECOND);
    return env.CACHE.put(key, JSON.stringify(entry), {
      expirationTtl: Math.max(life, KV_SHORTEST_LIFE),
    });
  },
  delete: (key) => env.CACHE.delete(key),
};

/**
 * What `read` answers, kept under `key` and fresh for `seconds`. `staleFor` is how long past that
 * it may still be answered, in seconds, for what is worse old than missing.
 *
 * The read is finished whether or not its caller waits for it. cachified keeps a read in progress
 * in this isolate's memory and hands it to whoever asks for the same key meanwhile. A page that
 * answers before one of its reads has (another read failed first, say) ends its request, and the
 * runtime drops the request's unfinished work: that read then never settles, never leaves
 * cachified's memory, and every later request for the key in the isolate waits on it for good
 * (#238: `/players/<an unknown id>` gave no answer for 40 seconds and more). `waitUntil` keeps
 * the request alive until the read has settled, which ESPN's ten-second limit bounds.
 */
export function cached<Value>(
  key: string,
  seconds: number,
  read: () => Promise<Value>,
  staleFor: number = STALE_FOR,
): Promise<Value> {
  const answer = cachified<Value>({
    key,
    cache: kv,
    ttl: seconds * SECOND,
    staleWhileRevalidate: staleFor * SECOND,
    getFreshValue: read,
    // The read behind a stale answer outlives the request or the Agent's call that asked.
    waitUntil,
  });
  // A failure is the caller's to hear, not this.
  waitUntil(answer.catch(() => {}));
  return answer;
}

/** Deletes keys, so the next read of each is a fresh one. Resolves once they are gone. */
export async function forget(keys: Iterable<string>): Promise<void> {
  await Promise.all([...new Set(keys)].map((key) => env.CACHE.delete(key)));
}
