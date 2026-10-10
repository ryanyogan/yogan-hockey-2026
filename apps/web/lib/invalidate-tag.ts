import { env } from "cloudflare:workers";
import { revalidateTag } from "next/cache";
import { runWithExecutionContext } from "vinext/shims/request-context";
import { bumpPageTags } from "./page-cache";

/**
 * Invalidates cache tags from outside a page request, which is where an Agent
 * runs, and resolves once the invalidations are written.
 *
 * Outside a request `revalidateTag` returns nothing and leaves its write
 * floating, so the caller could reply before the tag is invalidated. Handing it
 * an execution context makes it give the write to `waitUntil`, where it can be
 * awaited.
 *
 * The tags that whole pages depend on (`lib/page-cache.ts`) are marked as invalidated as well,
 * in one write, after the data is: a page rendered from then on reads new data, and no page
 * rendered before is answered again.
 */
export async function invalidateTags(tags: string[]): Promise<void> {
  const writes: Promise<unknown>[] = [];
  const collectWrites = { waitUntil: (write: Promise<unknown>) => void writes.push(write) };
  for (const tag of tags) {
    runWithExecutionContext(collectWrites, () => revalidateTag(tag, { expire: 0 }));
  }
  await Promise.all(writes);
  await bumpPageTags(env.VINEXT_KV_CACHE, tags);
}

/** `invalidateTags` for one tag. */
export function invalidateTag(tag: string): Promise<void> {
  return invalidateTags([tag]);
}
