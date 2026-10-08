import { routeAgentRequest } from "agents";
import site from "vinext/server/fetch-handler";

import { pageVersionReader, servePage, withoutPageCacheMark } from "./lib/page-cache";
import { watchRender } from "./lib/render-failure";

export * from "./agents";

// The isolate's own: the tags' invalidation times it last read, and the stale pages it is
// rendering again.
const readVersions = pageVersionReader();
const refreshing = new Map<string, number>();

export default {
  async fetch(incoming, env, ctx) {
    // The mark of a cacheable page is the cache's to set, never a visitor's.
    const request = withoutPageCacheMark(incoming);
    if (new URL(request.url).pathname.startsWith("/agents/")) {
      const response = await routeAgentRequest(request, env);
      return response ?? new Response("No such agent", { status: 404 });
    }
    // A page is answered from the edge cache when it may be (`lib/page-cache.ts`). A page whose
    // render failed is drawn by `app/error.tsx`, answered with an error status and not kept.
    return servePage(request, {
      // Compiled in by `vite.config.ts`; empty under `pnpm dev`, which turns the cache off.
      build: process.env.PAGE_CACHE_BUILD ?? "",
      // A cache of the site's own at the edge. `caches.default` is the same store under another
      // name, and is not in the types the site is checked against.
      cache: await caches.open("pages"),
      versions: (tags) => readVersions(env.VINEXT_KV_CACHE, tags, Date.now()),
      refreshing,
      render: (page) => watchRender(() => site.fetch(page, env, ctx)),
      waitUntil: (work) => ctx.waitUntil(work),
      now: Date.now,
    });
  },
} satisfies ExportedHandler<Env>;
