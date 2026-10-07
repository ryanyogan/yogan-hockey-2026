/**
 * The page cache: whole rendered pages kept in Cloudflare's edge cache, in front of vinext
 * (spec section 2). The Worker's entry answers a page from here before it renders anything.
 *
 * - **Which pages**: `pagePolicy`. A page is cacheable when its HTML depends on its address and
 *   on slow data alone; what changes by the minute (the slate, picks) reaches it after first
 *   paint. The Worker marks each such request with `PAGE_CACHE_REQUEST_HEADER`, which is how the
 *   root layout knows to leave the Scoreboard out of the render.
 * - **The key** (`pageCacheKey`): the build, document or RSC, the path, the query parameters the
 *   page reads, the version of each tag the page depends on, and for an RSC answer a hash of the
 *   headers vinext varies it by. An address with any other query parameter has no key: it is
 *   rendered, and neither read from the cache nor stored. A final moves a tag's version (`bumpPageTag`), so the page it
 *   made stale is never asked for again; nothing is purged.
 * - **Stale while it refreshes** (`servePage`): an entry older than `FRESH_MS` is answered at
 *   once and rendered again behind the response. One older than `MAX_STALE_MS` is not answered:
 *   the visitor waits for the render. The edge drops an entry after `KEEP_SECONDS`.
 *
 * Only a whole 200 of the kind asked for, that set no cookie and whose render neither failed nor
 * asked not to be kept (`doNotKeepPage` in `lib/render-failure.ts`), is stored.
 */

/**
 * Set on the request the Worker hands to vinext for a cacheable page, and by nothing else: a
 * visitor's own is taken off before anything reads it (`withoutPageCacheMark`).
 */
export const PAGE_CACHE_REQUEST_HEADER = "x-page-cacheable";
/**
 * On every answer for a cacheable page: `hit`, `stale`, `miss` (rendered and stored: nothing was
 * kept, or it was older than `MAX_STALE_MS`), `bypass` (rendered for this request alone: its
 * query is not the page's, or its browser knew of a later invalidation) or `off` (no build id).
 */
export const PAGE_CACHE_STATUS_HEADER = "x-page-cache";
/** On a `hit` or `stale`: the entry's age in seconds. */
export const PAGE_CACHE_AGE_HEADER = "x-page-cache-age";
/**
 * A cookie the browser sets when the Scoreboard's socket reports an invalidation, holding its
 * time in epoch milliseconds: an entry stored before it is not served to that browser. It covers
 * the minute a tag's new version can take to reach every data center.
 */
export const INVALIDATED_COOKIE = "yh-inv";

/** A tag every cacheable page depends on: moving its version empties the page cache by hand. */
export const ALL_PAGES_TAG = "pages";
const STANDINGS_TAG = "standings";

const FRESH_MS = 60_000;
/**
 * The oldest page a visitor is answered. Past it the first visitor waits for a render, as he did
 * before there was a page cache, and is not shown a page as old as the gap since the last one:
 * 12 hours after a quiet night. Ten minutes is twice the shortest time limit of the data beneath
 * (the standings, 5 minutes), and long enough that a page somebody opens every few minutes is
 * always answered at once.
 */
const MAX_STALE_MS = 10 * 60_000;
const KEEP_SECONDS = 12 * 60 * 60;
const STORED_AT_HEADER = "x-page-stored-at";
/** What vinext answers a rendered page with, and so what a cached one is answered with. */
const BROWSER_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";

/**
 * The request headers that change an RSC answer: the nine vinext names in its `Vary`
 * (`vinext/server/app-rsc-vary`), and the reuse manifest, which it reads without naming
 * (`app-rsc-request-normalization`): the layouts the browser says it already holds, which the
 * answer may then leave out.
 */
const RSC_VARY_HEADERS = [
  "Next-Router-State-Tree",
  "Next-Router-Prefetch",
  "Next-Router-Segment-Prefetch",
  "Next-Url",
  "X-Vinext-Interception-Context",
  "X-Vinext-Interception-Id",
  "X-Vinext-Mounted-Slots",
  "X-Vinext-Rsc-Render-Mode",
  "X-Vinext-Rsc-State-Fingerprint",
  "X-Vinext-Client-Reuse-Manifest",
];

/**
 * The one query parameter that is vinext's and not the page's: the cache buster its client puts
 * on an RSC request (`vinext/server/app-rsc-cache-busting`), which no render reads. Its other
 * parameter, `__vinext_cacheability_probe`, belongs to a deploy's own probe, which is to be
 * rendered: it is left to fall outside every policy.
 */
const RSC_CACHE_BUSTER = "_rsc";

export type PagePolicy = {
  /** The cache tags whose invalidation makes the page stale. */
  tags: string[];
  /** The query parameters the page reads. A request with any other is not answered from the cache. */
  query: string[];
};

/**
 * Whether the page at `pathname` is cached, and on what it depends. `null` is a page rendered
 * per request: the dashboard, the live page and a game's page draw the slate itself, and the
 * player search is a search.
 *
 * A player's page depends on `standings`, which every final invalidates: the Worker cannot know
 * a player's team without a read, and every final is a superset of his team's. A Tracked Player's
 * page is not cached: its Schedule tab reads today's date in its render (`scheduleOf`). A team's pages depend on that team alone; the conference and division in the header
 * come from the standings and catch up within `FRESH_MS` of the next visit.
 */
export function pagePolicy(pathname: string): PagePolicy | null {
  const path = pathname.replace(/\.rsc$/, "");
  if (path === "/nhl") return policy([STANDINGS_TAG], ["tab", "view"]);
  const team = /^\/nhl\/teams\/(\d+)(?:\/(?:roster|stats))?$/.exec(path);
  if (team) return policy([`team:${team[1]}`], []);
  if (/^\/players\/[^/]+$/.test(path)) return policy([STANDINGS_TAG], ["games"]);
  return null;
}

function policy(tags: string[], query: string[]): PagePolicy {
  return { tags: [ALL_PAGES_TAG, ...tags], query };
}

/**
 * Whether invalidating the data cache's `tag` must also move a page-cache version. Only the tags
 * `pagePolicy` names are kept: a final invalidates about fifty player tags, and no page is keyed
 * on one.
 */
export function isPageTag(tag: string): boolean {
  return tag === STANDINGS_TAG || tag === ALL_PAGES_TAG || /^team:\d+$/.test(tag);
}

/** The KV key holding a tag's page-cache version. */
export function pageTagVersionKey(tag: string): string {
  return `page-cache:version:${tag}`;
}

type VersionStore = {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

/** The current version of each tag, "0" for one never invalidated. One KV read a tag. */
export function readPageTagVersions(kv: VersionStore, tags: string[]): Promise<string[]> {
  return Promise.all(
    // 30 seconds is the shortest a data center may keep its own copy of a KV value.
    tags.map(async (tag) => (await kv.get(pageTagVersionKey(tag), { cacheTtl: 30 })) ?? "0"),
  );
}

/** Moves a tag's version, so every page keyed on it is rendered again. */
export async function bumpPageTag(kv: VersionStore, tag: string, now = Date.now()): Promise<void> {
  if (isPageTag(tag)) await kv.put(pageTagVersionKey(tag), String(now));
}

/**
 * The address a page's entry is kept under, or `null` for a request that is never answered from
 * the cache: not a GET, not a cacheable page, a Worker with no build id (local development), or
 * an address with a query parameter the page's policy does not name.
 *
 * That last is because the render sees the whole query whatever the key holds. A config redirect
 * matches on it (`/nhl/teams/1?tab=roster`, `legacyTeamTabRedirects()`), and vinext writes it
 * into the document, where `useSearchParams()` reads it: under a shared key the old link would be
 * answered the cached Schedule page, and one visitor's `?fbclid=` would be every visitor's.
 */
export async function pageCacheKey(
  request: Request,
  build: string,
  versions: (tags: string[]) => Promise<string[]>,
): Promise<string | null> {
  if (request.method !== "GET" || build === "") return null;
  const url = new URL(request.url);
  const found = pagePolicy(url.pathname);
  if (found == null) return null;

  for (const name of url.searchParams.keys()) {
    if (name !== RSC_CACHE_BUSTER && !found.query.includes(name)) return null;
  }

  const isRsc = request.headers.has("RSC") || url.pathname.endsWith(".rsc");
  const kind = isRsc ? "rsc" : "html";
  const key = new URL(`/__page-cache/${encodeURIComponent(build)}/${kind}${url.pathname}`, url);
  for (const name of [...found.query].sort()) {
    for (const value of url.searchParams.getAll(name)) key.searchParams.append(name, value);
  }
  key.searchParams.set("__v", (await versions(found.tags)).join("."));
  if (isRsc) key.searchParams.set("__h", await rscVariant(request.headers));
  return key.href;
}

async function rscVariant(headers: Headers): Promise<string> {
  const values = RSC_VARY_HEADERS.map((name) => headers.get(name) ?? "").join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(values));
  return [...new Uint8Array(digest).subarray(0, 12)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export type PageCacheDeps = {
  /** Names the build: a new build reads none of an old one's entries. Empty turns the cache off. */
  build: string;
  cache: {
    match(key: string): Promise<Response | undefined>;
    put(key: string, response: Response): Promise<void>;
  };
  versions(tags: string[]): Promise<string[]>;
  /**
   * Renders the page. `unstorable()` says, once the body has been read, whether the answer must
   * not be kept: a render failed, or drew a fallback or a not-found page inside a 200.
   */
  render(request: Request): Promise<{ response: Response; unstorable(): boolean }>;
  waitUntil(work: Promise<unknown>): void;
  now(): number;
};

/** Answers a request for a page: from the cache when it may, rendering and storing otherwise. */
export async function servePage(incoming: Request, deps: PageCacheDeps): Promise<Response> {
  const request = withoutPageCacheMark(incoming);
  if (pagePolicy(new URL(request.url).pathname) == null || request.method !== "GET") {
    return (await deps.render(request)).response;
  }
  // The same render with the cache off, so development draws what production does.
  const cacheable = new Request(request);
  cacheable.headers.set(PAGE_CACHE_REQUEST_HEADER, "1");

  if (deps.build === "") return withStatus((await deps.render(cacheable)).response, "off");
  const key = await pageCacheKey(request, deps.build, deps.versions).catch(() => null);
  if (key == null) return withStatus((await deps.render(cacheable)).response, "bypass");

  const entry = await deps.cache.match(key).catch(() => undefined);
  const storedAt = Number(entry?.headers.get(STORED_AT_HEADER));
  const age = deps.now() - storedAt;
  if (entry != null && Number.isFinite(storedAt) && age <= MAX_STALE_MS) {
    if (storedAt >= invalidatedAtOf(request)) {
      if (age > FRESH_MS) {
        // Nobody reads this render's answer; its copy is what is stored.
        deps.waitUntil(
          renderAndStore(cacheable, key, deps).then((unread) => unread.body?.cancel()),
        );
      }
      const response = withStatus(entry, age > FRESH_MS ? "stale" : "hit");
      response.headers.set(PAGE_CACHE_AGE_HEADER, String(Math.max(0, Math.round(age / 1000))));
      response.headers.set("cache-control", BROWSER_CACHE_CONTROL);
      response.headers.delete(STORED_AT_HEADER);
      return response;
    }
    return withStatus(await renderAndStore(cacheable, key, deps), "bypass");
  }
  return withStatus(await renderAndStore(cacheable, key, deps), "miss");
}

/** Renders the page, answers with it as it streams, and stores a copy once it is whole. */
async function renderAndStore(
  request: Request,
  key: string,
  deps: PageCacheDeps,
): Promise<Response> {
  const { response, unstorable } = await deps.render(request);
  // The key says document or RSC from the request; an answer of the other kind, whatever header
  // brought it about, is not kept under it.
  const wanted = key.includes("/rsc/") ? "text/x-component" : "text/html";
  const isWanted = response.headers.get("content-type")?.startsWith(wanted) ?? false;
  if (
    response.status !== 200 ||
    response.body == null ||
    !isWanted ||
    response.headers.has("set-cookie")
  ) {
    return response;
  }
  const [answer, copy] = response.body.tee();
  const storedAt = deps.now();
  deps.waitUntil(
    (async () => {
      // Read to the end before deciding: a render can fail after the response has started.
      const body = await new Response(copy).arrayBuffer();
      if (unstorable()) return;
      const headers = new Headers(response.headers);
      headers.set("cache-control", `public, s-maxage=${KEEP_SECONDS}`);
      headers.set(STORED_AT_HEADER, String(storedAt));
      await deps.cache.put(key, new Response(body, { status: 200, headers }));
    })().catch((error) => console.error("Page cache: could not store", key, error)),
  );
  return new Response(answer, response);
}

/**
 * The request without a page-cache mark of the sender's own. The Worker's entry passes every
 * request through this before anything else: with the mark, a page that is not cached would be
 * rendered without its server-drawn slate for whoever sent it.
 */
export function withoutPageCacheMark(request: Request): Request {
  if (!request.headers.has(PAGE_CACHE_REQUEST_HEADER)) return request;
  const unmarked = new Request(request);
  unmarked.headers.delete(PAGE_CACHE_REQUEST_HEADER);
  return unmarked;
}

function withStatus(response: Response, status: string): Response {
  const answer = new Response(response.body, response);
  answer.headers.set(PAGE_CACHE_STATUS_HEADER, status);
  return answer;
}

function invalidatedAtOf(request: Request): number {
  const cookie = request.headers.get("cookie") ?? "";
  const found = new RegExp(`(?:^|;\\s*)${INVALIDATED_COOKIE}=(\\d+)`).exec(cookie);
  return found ? Number(found[1]) : 0;
}
