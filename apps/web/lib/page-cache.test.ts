import { describe, expect, it } from "vitest";
import {
  bumpPageTag,
  INVALIDATED_COOKIE,
  PAGE_CACHE_REQUEST_HEADER,
  PAGE_CACHE_STATUS_HEADER,
  type PageCacheDeps,
  pageCacheKey,
  pagePolicy,
  readPageTagVersions,
  servePage,
} from "./page-cache";

const SITE = "https://hockey.test";

/** KV as the page cache uses it. */
function versionStore() {
  const values = new Map<string, string>();
  return {
    get: async (key: string) => values.get(key) ?? null,
    put: async (key: string, value: string) => void values.set(key, value),
  };
}

/** What the Scoreboard does to the tags at a final of teams 1 and 2 (`agents/final-game.ts`). */
async function final(kv: ReturnType<typeof versionStore>, now: number) {
  for (const tag of ["standings", "team:1", "team:2", "game:401", "player:77"]) {
    await bumpPageTag(kv, tag, now);
  }
}

function keyOf(
  kv: ReturnType<typeof versionStore>,
  path: string,
  build = "b1",
  init?: RequestInit,
) {
  return pageCacheKey(new Request(SITE + path, init), build, (tags) =>
    readPageTagVersions(kv, tags),
  );
}

describe("which pages are cached", () => {
  it.each([
    "/nhl",
    "/nhl/teams/1",
    "/nhl/teams/1/roster",
    "/nhl/teams/1/stats.rsc",
    "/players/4024123",
    "/family/rylan",
  ])("%s is", (path) => expect(pagePolicy(path)).not.toBeNull());

  it.each([
    "/",
    "/nhl/live",
    "/nhl/games/401892449",
    "/players",
    "/nhl/teams/1/nonsense",
    "/skeleton/picks",
    "/agents/scoreboard-agent/today",
  ])("%s is not", (path) => expect(pagePolicy(path)).toBeNull());
});

describe("the page cache's key", () => {
  it("changes at a final for the standings and the two teams' pages, and for no other team's", async () => {
    const kv = versionStore();
    const paths = ["/nhl", "/nhl/teams/1", "/nhl/teams/2/roster", "/nhl/teams/3", "/players/9"];
    const before = await Promise.all(paths.map((path) => keyOf(kv, path)));
    await final(kv, 1_000);
    const after = await Promise.all(paths.map((path) => keyOf(kv, path)));

    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
    expect(after[2]).not.toBe(before[2]);
    expect(after[3]).toBe(before[3]);
    // A player's page is keyed on every final: the Worker does not know his team.
    expect(after[4]).not.toBe(before[4]);
  });

  it("writes a version only for a tag a page is keyed on", async () => {
    const kv = versionStore();
    await final(kv, 1_000);
    expect(await kv.get("page-cache:version:team:1")).toBe("1000");
    expect(await kv.get("page-cache:version:player:77")).toBeNull();
    expect(await kv.get("page-cache:version:game:401")).toBeNull();
  });

  it("changes for every page when the `pages` tag is moved by hand", async () => {
    const kv = versionStore();
    const before = await keyOf(kv, "/nhl/teams/3");
    await bumpPageTag(kv, "pages", 5);
    expect(await keyOf(kv, "/nhl/teams/3")).not.toBe(before);
  });

  it("keeps an RSC answer apart from the document, and one RSC variant from another", async () => {
    const kv = versionStore();
    const html = await keyOf(kv, "/nhl/teams/1");
    const byHeader = await keyOf(kv, "/nhl/teams/1", "b1", { headers: { RSC: "1" } });
    const bySuffix = await keyOf(kv, "/nhl/teams/1.rsc");
    const prefetch = await keyOf(kv, "/nhl/teams/1.rsc", "b1", {
      headers: { RSC: "1", "Next-Router-Prefetch": "1" },
    });
    expect(new Set([html, byHeader, bySuffix, prefetch]).size).toBe(4);
  });

  it("does not read another build's entries", async () => {
    const kv = versionStore();
    expect(await keyOf(kv, "/nhl", "b2")).not.toBe(await keyOf(kv, "/nhl", "b1"));
  });

  it("holds the query a page reads, in one order, and nothing else of it", async () => {
    const kv = versionStore();
    const plain = await keyOf(kv, "/nhl");
    expect(await keyOf(kv, "/nhl?view=league")).not.toBe(plain);
    expect(await keyOf(kv, "/nhl?utm_source=x&_rsc=abc")).toBe(plain);
    expect(await keyOf(kv, "/nhl?view=league&tab=teams")).toBe(
      await keyOf(kv, "/nhl?tab=teams&view=league"),
    );
    expect(await keyOf(kv, "/nhl/teams/1?tab=roster")).toBe(await keyOf(kv, "/nhl/teams/1"));
  });

  it("is null with no build (development), for a page not cached, and for a POST", async () => {
    const kv = versionStore();
    expect(await keyOf(kv, "/nhl", "")).toBeNull();
    expect(await keyOf(kv, "/nhl/live")).toBeNull();
    expect(await keyOf(kv, "/nhl", "b1", { method: "POST" })).toBeNull();
  });
});

/** A Worker with a cache, a clock and a render that counts. */
function worker({ build = "b1" } = {}) {
  const kv = versionStore();
  const entries = new Map<string, Response>();
  const pending: Promise<unknown>[] = [];
  const state = {
    now: 0,
    renders: 0,
    seen: [] as Request[],
    page: () =>
      new Response(`render ${state.renders}`, { headers: { "content-type": "text/html" } }),
    failed: false,
  };
  const deps: PageCacheDeps = {
    build,
    cache: {
      match: async (key) => entries.get(key)?.clone(),
      put: async (key, response) => void entries.set(key, response),
    },
    versions: (tags) => readPageTagVersions(kv, tags),
    render: async (request) => {
      state.renders += 1;
      state.seen.push(request);
      return { response: state.page(), failed: () => state.failed };
    },
    waitUntil: (work) => void pending.push(work),
    now: () => state.now,
  };
  const get = async (path: string, init?: RequestInit) => {
    const response = await servePage(new Request(SITE + path, init), deps);
    const body = await response.text();
    // What `waitUntil` was given is done before the next request, as it is by then at the edge.
    await Promise.all(pending.splice(0));
    return { status: response.headers.get(PAGE_CACHE_STATUS_HEADER), body, response };
  };
  return { kv, entries, state, get };
}

describe("serving a page", () => {
  it("renders once, then answers from the cache", async () => {
    const { get, state } = worker();
    expect(await get("/nhl")).toMatchObject({ status: "miss", body: "render 1" });
    expect(await get("/nhl")).toMatchObject({ status: "hit", body: "render 1" });
    expect(state.renders).toBe(1);
  });

  it("answers a stale entry at once and renders again behind it", async () => {
    const { get, state } = worker();
    await get("/nhl");
    state.now = 61_000;
    expect(await get("/nhl")).toMatchObject({ status: "stale", body: "render 1" });
    expect(await get("/nhl")).toMatchObject({ status: "hit", body: "render 2" });
  });

  it("answers a cached page as vinext answers a rendered one: not for the browser to keep", async () => {
    const { get } = worker();
    await get("/nhl");
    const { response } = await get("/nhl");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-page-cache-age")).toBe("0");
    expect(response.headers.has("x-page-stored-at")).toBe(false);
  });

  it("renders again after a final, and not for a team that did not play", async () => {
    const { get, kv } = worker();
    await get("/nhl/teams/1");
    await get("/nhl/teams/3");
    await final(kv, 10);
    expect((await get("/nhl/teams/1")).status).toBe("miss");
    expect((await get("/nhl/teams/3")).status).toBe("hit");
  });

  it("does not store an error page, a 404, a redirect, a page that sets a cookie or the wrong kind", async () => {
    const { get, state, entries } = worker();
    for (const page of [
      () => new Response("unavailable", { status: 503 }),
      () => new Response("no such team", { status: 404 }),
      () => new Response(null, { status: 308, headers: { location: "/nhl" } }),
      () =>
        new Response("hello", { headers: { "set-cookie": "a=b", "content-type": "text/html" } }),
      // Not the kind the key names: a document was asked for.
      () => new Response("0:{}", { headers: { "content-type": "text/x-component" } }),
    ]) {
      state.page = page;
      await get("/nhl/teams/1");
    }
    expect(entries.size).toBe(0);
    expect(state.renders).toBe(5);
  });

  it("does not store a page whose render failed after the response had started", async () => {
    const { get, state, entries } = worker();
    state.failed = true;
    expect((await get("/nhl")).body).toBe("render 1");
    expect(entries.size).toBe(0);
  });

  it("serves no entry older than the invalidation the browser has heard of", async () => {
    const { get, state } = worker();
    state.now = 1_000;
    await get("/nhl");
    const cookie = { headers: { cookie: `theme=dark; ${INVALIDATED_COOKIE}=2000` } };
    state.now = 3_000;
    expect(await get("/nhl", cookie)).toMatchObject({ status: "bypass", body: "render 2" });
    // What that render stored is newer than the invalidation, for this browser and every other.
    expect(await get("/nhl", cookie)).toMatchObject({ status: "hit", body: "render 2" });
  });

  it("marks a cacheable page's request for the layout, cache or no cache", async () => {
    const { get, state } = worker({ build: "" });
    expect((await get("/nhl")).status).toBe("off");
    expect((await get("/nhl")).status).toBe("off");
    expect(state.seen.every((request) => request.headers.has(PAGE_CACHE_REQUEST_HEADER))).toBe(
      true,
    );
  });

  it("leaves every other request alone", async () => {
    const { get, state, entries } = worker();
    expect((await get("/nhl/live")).status).toBeNull();
    expect((await get("/nhl", { method: "POST" })).status).toBeNull();
    expect(state.seen.some((request) => request.headers.has(PAGE_CACHE_REQUEST_HEADER))).toBe(
      false,
    );
    expect(entries.size).toBe(0);
  });
});
