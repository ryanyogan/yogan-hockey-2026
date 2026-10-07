import { describe, expect, it } from "vitest";
import {
  bumpPageTags,
  INVALIDATED_COOKIE,
  PAGE_CACHE_REQUEST_HEADER,
  PAGE_CACHE_STATUS_HEADER,
  PAGE_VERSIONS_KEY,
  type PageCacheDeps,
  pageCacheKey,
  pagePolicy,
  pageVersionReader,
  servePage,
  VERSIONS_MEMO_MS,
} from "./page-cache";

const SITE = "https://hockey.test";

/** KV as the page cache uses it, counting its reads. */
function versionStore() {
  const values = new Map<string, string>();
  const store = {
    reads: 0,
    puts: 0,
    get: async (key: string) => {
      store.reads += 1;
      return values.get(key) ?? null;
    },
    put: async (key: string, value: string) => {
      store.puts += 1;
      values.set(key, value);
    },
  };
  return store;
}

/** What the Scoreboard does to the tags at a final of teams 1 and 2 (`agents/final-game.ts`). */
async function final(kv: ReturnType<typeof versionStore>, now: number) {
  await bumpPageTags(kv, ["standings", "team:1", "team:2"], now);
  await bumpPageTags(kv, ["game:401"], now);
  await bumpPageTags(kv, ["player:77"], now);
}

function keyOf(path: string, build = "b1", init?: RequestInit) {
  return pageCacheKey(new Request(SITE + path, init), build);
}

describe("which pages are cached", () => {
  it.each([
    "/nhl",
    "/nhl/teams/1",
    "/nhl/teams/1/roster",
    "/nhl/teams/1/stats.rsc",
    "/players/4024123",
  ])("%s is", (path) => expect(pagePolicy(path)).not.toBeNull());

  it.each([
    "/",
    "/nhl/live",
    "/nhl/games/401892449",
    "/players",
    // Its Schedule tab reads today's date in its render.
    "/family/rylan",
    "/nhl/teams/1/nonsense",
    "/skeleton/picks",
    "/agents/scoreboard-agent/today",
    // Static files are the platform's to serve, with their own cache headers (`public/_headers`).
    "/team-marks/10-28.2288c70a.webp",
    "/team-marks/no-such-mark.webp",
    "/assets/index-abc123.js",
    "/favicon.ico",
  ])("%s is not", (path) => expect(pagePolicy(path)).toBeNull());
});

describe("the page cache's key", () => {
  it("keeps an RSC answer apart from the document, and one RSC variant from another", async () => {
    const html = await keyOf("/nhl/teams/1");
    const byHeader = await keyOf("/nhl/teams/1", "b1", { headers: { RSC: "1" } });
    const bySuffix = await keyOf("/nhl/teams/1.rsc");
    const prefetch = await keyOf("/nhl/teams/1.rsc", "b1", {
      headers: { RSC: "1", "Next-Router-Prefetch": "1" },
    });
    expect(new Set([html, byHeader, bySuffix, prefetch]).size).toBe(4);
  });

  it("does not read another build's entries", async () => {
    expect(await keyOf("/nhl", "b2")).not.toBe(await keyOf("/nhl", "b1"));
  });

  it("holds the query a page reads, in one order", async () => {
    const plain = await keyOf("/nhl");
    expect(await keyOf("/nhl?view=league")).not.toBe(plain);
    expect(await keyOf("/nhl?view=league&tab=teams")).toBe(
      await keyOf("/nhl?tab=teams&view=league"),
    );
    // vinext's own cache buster on an RSC request is not the page's to read.
    expect(await keyOf("/nhl?_rsc=abc")).toBe(plain);
    expect(await keyOf("/nhl?view=league&_rsc=abc")).toBe(await keyOf("/nhl?view=league"));
  });

  // The render sees the whole query whatever the key holds: a config redirect matches on it
  // (`?tab=roster` on a team) and vinext writes it into the document for `useSearchParams()`.
  it.each([
    "/nhl/teams/1?tab=roster",
    "/nhl/teams/1?fbclid=x",
    "/nhl?utm_source=x",
    "/nhl?view=league&utm_source=x",
    "/players/9?games=all&ref=y",
    "/nhl/teams/1.rsc?fbclid=x&_rsc=abc",
    "/nhl?__vinext_cacheability_probe=1",
  ])(
    "is null for %s: a query the page's policy does not name is rendered, never keyed",
    async (path) => {
      expect(await keyOf(path)).toBeNull();
    },
  );

  it("keeps apart two RSC answers that differ in what the browser says it already holds", async () => {
    const rsc = (manifest: string) =>
      keyOf("/nhl/teams/1.rsc", "b1", {
        headers: { RSC: "1", "X-Vinext-Client-Reuse-Manifest": manifest },
      });
    expect(await rsc("a")).not.toBe(await rsc("b"));
  });

  it("is null with no build (development), for a page not cached, and for a POST", async () => {
    expect(await keyOf("/nhl", "")).toBeNull();
    expect(await keyOf("/nhl/live")).toBeNull();
    expect(await keyOf("/nhl", "b1", { method: "POST" })).toBeNull();
  });
});

describe("the tags' invalidation times", () => {
  const read = (kv: ReturnType<typeof versionStore>, tags: string[]) =>
    pageVersionReader()(kv, tags, 0);

  it("move at a final for the standings and the two teams, and for no other team", async () => {
    const kv = versionStore();
    await final(kv, 1_000);
    expect((await read(kv, ["pages", "standings"])).invalidatedAt).toBe(1_000);
    expect((await read(kv, ["pages", "team:1"])).invalidatedAt).toBe(1_000);
    expect((await read(kv, ["pages", "team:2"])).invalidatedAt).toBe(1_000);
    expect((await read(kv, ["pages", "team:3"])).invalidatedAt).toBe(0);
  });

  it("are one document, written once for a final, holding only tags a page depends on", async () => {
    const kv = versionStore();
    await final(kv, 1_000);
    expect(kv.puts).toBe(1);
    expect(JSON.parse((await kv.get(PAGE_VERSIONS_KEY)) ?? "")).toEqual({
      standings: 1_000,
      "team:1": 1_000,
      "team:2": 1_000,
    });
  });

  it("keep an earlier final's when KV answers a write's read with an old copy", async () => {
    const kv = versionStore();
    await bumpPageTags(kv, ["team:1"], 1_000);
    // The same store (one isolate), whose read has not caught up with its own write.
    const get = kv.get;
    kv.get = async () => null;
    await bumpPageTags(kv, ["team:2"], 2_000);
    kv.get = get;
    expect(JSON.parse((await kv.get(PAGE_VERSIONS_KEY)) ?? "")).toEqual({
      "team:1": 1_000,
      "team:2": 2_000,
    });
  });

  it("never move a tag backwards, and lose neither of two writes at once", async () => {
    const kv = versionStore();
    await bumpPageTags(kv, ["standings"], 5_000);
    await Promise.all([
      bumpPageTags(kv, ["standings"], 4_000),
      bumpPageTags(kv, ["team:9"], 6_000),
    ]);
    expect(JSON.parse((await kv.get(PAGE_VERSIONS_KEY)) ?? "")).toEqual({
      standings: 5_000,
      "team:9": 6_000,
    });
  });

  it("are written again when KV refuses a write (one a second to a key)", async () => {
    const kv = versionStore();
    const put = kv.put;
    let refusals = 2;
    kv.put = async (key, value) => {
      if (refusals-- > 0) throw new Error("429");
      await put(key, value);
    };
    await bumpPageTags(kv, ["standings"], 7_000, 0);
    expect((await read(kv, ["standings"])).invalidatedAt).toBe(7_000);

    kv.put = async () => {
      throw new Error("429");
    };
    await expect(bumpPageTags(kv, ["standings"], 8_000, 0)).rejects.toThrow("429");
  });

  it("are read from KV once in ten seconds an isolate, whatever the tags", async () => {
    const kv = versionStore();
    const reader = pageVersionReader();
    expect((await reader(kv, ["standings"], 0)).from).toBe("kv");
    await final(kv, 1_000);
    kv.reads = 0;
    expect(await reader(kv, ["team:1"], VERSIONS_MEMO_MS - 1)).toEqual({
      invalidatedAt: 0,
      from: "memo",
    });
    expect(kv.reads).toBe(0);
    expect(await reader(kv, ["team:1"], VERSIONS_MEMO_MS)).toEqual({
      invalidatedAt: 1_000,
      from: "kv",
    });
    expect(kv.reads).toBe(1);
  });

  it("fail on a document that is not one, and are read again the next time", async () => {
    const kv = versionStore();
    const reader = pageVersionReader();
    await kv.put(PAGE_VERSIONS_KEY, "[1]");
    await expect(reader(kv, ["standings"], 0)).rejects.toThrow();
    await kv.put(PAGE_VERSIONS_KEY, '{"standings":3,"junk":"x"}');
    expect((await reader(kv, ["standings", "junk"], 0)).invalidatedAt).toBe(3);
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
    unstorable: false,
    versionsFail: false,
    renderMs: 0,
  };
  // No memo: each test's requests are years apart or a millisecond, as it needs.
  const readVersions = pageVersionReader(0);
  const deps: PageCacheDeps = {
    build,
    cache: {
      match: async (key) => entries.get(key)?.clone(),
      put: async (key, response) => void entries.set(key, response),
    },
    versions: (tags) => {
      if (state.versionsFail) return Promise.reject(new Error("KV is away"));
      return readVersions(kv, tags, state.now);
    },
    render: async (request) => {
      state.renders += 1;
      state.seen.push(request);
      const response = state.page();
      // A render takes time, and reads its data after it has begun.
      state.now += state.renderMs;
      return { response, unstorable: () => state.unstorable };
    },
    refreshing: new Map(),
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
  return { kv, entries, state, get, deps, pending };
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
    const { get, kv, state, entries } = worker();
    await get("/nhl/teams/1");
    await get("/nhl/teams/3");
    await final(kv, 10);
    state.now = 20;
    expect((await get("/nhl/teams/1")).status).toBe("miss");
    expect((await get("/nhl/teams/3")).status).toBe("hit");
    // What that render stored is under the same key, and newer than the final.
    expect((await get("/nhl/teams/1")).status).toBe("hit");
    expect(entries.size).toBe(2);
  });

  it("does not answer a page whose render began before a final that ended during it", async () => {
    const { get, kv, state } = worker();
    state.now = 1_000;
    state.renderMs = 500;
    // The render began at 1000, the final was at 1200: what it read may be from before.
    const first = get("/nhl");
    await final(kv, 1_200);
    await first;
    expect((await get("/nhl")).status).toBe("miss");
    expect((await get("/nhl")).status).toBe("hit");
  });

  it("renders every page again when the `pages` tag is moved by hand", async () => {
    const { get, kv, state } = worker();
    await get("/nhl/teams/3");
    await get("/players/9");
    await bumpPageTags(kv, ["pages"], 5);
    state.now = 6;
    expect((await get("/nhl/teams/3")).status).toBe("miss");
    expect((await get("/players/9")).status).toBe("miss");
  });

  it("renders for the one request, and keeps nothing, when the tags' times cannot be read", async () => {
    const { get, state, entries } = worker();
    await get("/nhl");
    state.versionsFail = true;
    expect(await get("/nhl")).toMatchObject({ status: "bypass", body: "render 2" });
    expect(entries.size).toBe(1);
    state.versionsFail = false;
    expect(await get("/nhl")).toMatchObject({ status: "hit", body: "render 1" });
  });

  it("says where a hit's time went", async () => {
    const { get } = worker();
    await get("/nhl");
    const timing = (await get("/nhl")).response.headers.get("server-timing");
    expect(timing).toMatch(/versions;dur=\d+;desc=kv/);
    expect(timing).toMatch(/match;dur=\d+/);
    expect(timing).toMatch(/total;dur=\d+/);
  });

  it("renders a stale page again once, however many ask for it meanwhile", async () => {
    const { deps, state, pending } = worker();
    const ask = async () =>
      (await servePage(new Request(`${SITE}/nhl`), deps)).headers.get(PAGE_CACHE_STATUS_HEADER);
    await ask();
    await Promise.all(pending.splice(0));
    state.now = 61_000;
    // Three visitors before the first one's render is stored.
    expect([await ask(), await ask(), await ask()]).toEqual(["stale", "stale", "stale"]);
    expect(state.renders).toBe(2);
    await Promise.all(pending.splice(0));
    expect(await ask()).toBe("hit");

    // A render that was never stored does not stop the next one for ever.
    state.now += 61_000;
    state.unstorable = true;
    expect(await ask()).toBe("stale");
    await Promise.all(pending.splice(0));
    expect(await ask()).toBe("stale");
    expect(state.renders).toBe(4);
  });

  const html = { "content-type": "text/html; charset=utf-8" };
  it.each<[string, () => Response]>([
    // Each is a document with a body, as vinext answers it: only what the name says is wrong.
    ["an error page", () => new Response("unavailable", { status: 503, headers: html })],
    ["a 404", () => new Response("no such team", { status: 404, headers: html })],
    [
      "a redirect",
      () => new Response("/nhl", { status: 308, headers: { ...html, location: "/nhl" } }),
    ],
    [
      "a page that sets a cookie",
      () => new Response("hello", { headers: { ...html, "set-cookie": "a=b" } }),
    ],
    [
      "an RSC answer to a request for a document",
      () => new Response("0:{}", { headers: { "content-type": "text/x-component" } }),
    ],
    ["an answer with no body", () => new Response(null, { headers: html })],
  ])("does not store %s", async (_, page) => {
    const { get, state, entries } = worker();
    state.page = page;
    expect((await get("/nhl/teams/1")).status).toBe("miss");
    expect((await get("/nhl/teams/1")).status).toBe("miss");
    expect(entries.size).toBe(0);
    expect(state.renders).toBe(2);
  });

  it("does not store a page whose render said not to keep it: it failed after the response had started, or drew a fallback or a not-found page inside a 200", async () => {
    const { get, state, entries } = worker();
    state.unstorable = true;
    expect((await get("/nhl")).body).toBe("render 1");
    expect(entries.size).toBe(0);
  });

  it("renders in the foreground once an entry is ten minutes old: no visitor is answered an older page", async () => {
    const { get, state } = worker();
    await get("/nhl");
    state.now = 10 * 60_000;
    expect(await get("/nhl")).toMatchObject({ status: "stale", body: "render 1" });
    state.now += 10 * 60_000 + 1;
    expect(await get("/nhl")).toMatchObject({ status: "miss", body: "render 3" });
    expect(await get("/nhl")).toMatchObject({ status: "hit", body: "render 3" });
  });

  it("renders an address with a query its page does not read, and neither reads nor writes the cache", async () => {
    const { get, state, entries } = worker();
    await get("/nhl/teams/1");
    // The old address of the Roster tab: vinext answers its redirect, cached page or no.
    state.page = () =>
      new Response(null, { status: 308, headers: { location: "/nhl/teams/1/roster" } });
    const moved = await get("/nhl/teams/1?tab=roster");
    expect(moved.response.status).toBe(308);
    expect(moved.status).toBe("bypass");

    state.page = () => new Response("with fbclid", { headers: html });
    expect(await get("/nhl/teams/1?fbclid=x")).toMatchObject({
      status: "bypass",
      body: "with fbclid",
    });
    expect(new URL(state.seen.at(-1)?.url ?? "").search).toBe("?fbclid=x");
    expect(await get("/nhl/teams/1?fbclid=x")).toMatchObject({ status: "bypass" });

    expect(entries.size).toBe(1);
    expect(await get("/nhl/teams/1")).toMatchObject({ status: "hit", body: "render 1" });
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
    expect((await get("/team-marks/no-such-mark.webp")).status).toBeNull();
    expect((await get("/nhl", { method: "POST" })).status).toBeNull();
    expect(state.seen.some((request) => request.headers.has(PAGE_CACHE_REQUEST_HEADER))).toBe(
      false,
    );
    expect(entries.size).toBe(0);
  });

  it("takes the mark from the cache alone, never from the visitor", async () => {
    const { get, state } = worker();
    const marked = { headers: { [PAGE_CACHE_REQUEST_HEADER]: "1" } };
    // A page that is not cacheable draws the slate on the server: the mark would take it away.
    await get("/", marked);
    await get("/nhl/live", marked);
    await get("/nhl", { method: "POST", ...marked });
    expect(state.seen.map((request) => request.headers.has(PAGE_CACHE_REQUEST_HEADER))).toEqual([
      false,
      false,
      false,
    ]);
  });
});
