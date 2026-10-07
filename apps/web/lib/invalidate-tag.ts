import { env } from "cloudflare:workers";
import { revalidateTag } from "next/cache";
import { runWithExecutionContext } from "vinext/shims/request-context";
import { bumpPageTag } from "./page-cache";

/**
 * Invalidates a cache tag from outside a page request, which is where an Agent
 * runs, and resolves once the invalidation is written.
 *
 * Outside a request `revalidateTag` returns nothing and leaves its write
 * floating, so the caller could reply before the tag is invalidated. Handing it
 * an execution context makes it give the write to `waitUntil`, where it can be
 * awaited.
 *
 * A tag that whole pages are keyed on (`lib/page-cache.ts`) has its page-cache version moved
 * as well, after the data is invalidated: a page rendered from then on reads new data, and no
 * page rendered before is served under the new key.
 */
export async function invalidateTag(tag: string): Promise<void> {
  const writes: Promise<unknown>[] = [];
  const collectWrites = { waitUntil: (write: Promise<unknown>) => void writes.push(write) };
  runWithExecutionContext(collectWrites, () => revalidateTag(tag, { expire: 0 }));
  await Promise.all(writes);
  await bumpPageTag(env.VINEXT_KV_CACHE, tag);
}
