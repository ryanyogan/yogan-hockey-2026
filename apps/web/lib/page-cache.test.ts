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

  it("holds the query a page reads, in one order", async () => {
    const kv = versionStore();
    const plain = await keyOf(kv, "/nhl");
    expect(await keyOf(kv, "/nhl?view=league")).not.toBe(plain);
    expect(await keyOf(kv, "/nhl?view=league&tab=teams")).toBe(
      await keyOf(kv, "/nhl?tab=teams&view=league"),
    );
    // vinext's own cache buster on an RSC request is not the page's to read.
    expect(await keyOf(kv, "/nhl?_rsc=abc")).toBe(plain);
    expect(await keyOf(kv, "/nhl?view=league&_rsc=abc")).toBe(await keyOf(kv, "/nhl?view=league"));
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
      expect(await keyOf(versionStore(), path)).toBeNull();
    },
  );

  it("keeps apart two RSC answers that differ in what the browser says it already holds", async () => {
    const kv = versionStore();
    const rsc = (manifest: string) =>
      keyOf(kv, "/nhl/teams/1.rsc", "b1", {
        headers: { RSC: "1", "X-Vinext-Client-Reuse-Manifest": manifest },
      });
    expect(await rsc("a")).not.toBe(await rsc("b"));
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
    unstorable: false,
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
      return { response: state.page(), unstorable: () => state.unstorable };
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
