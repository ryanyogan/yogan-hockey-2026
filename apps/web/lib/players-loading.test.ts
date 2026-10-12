import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  type PlayersPage,
  readPlayersPage,
  type SearchBrowser,
  searchLoading,
} from "./player-search";
import type { PlayerSearch } from "./players";
import { parseSearchText, stringifySearchText } from "./search-text";

const MINUTE = 60 * 1000;

const found = ({ q }: PlayersPage): PlayerSearch => ({
  status: "found",
  query: q,
  players: [{ id: "1", name: q, jersey: null, position: "C", headshot: null, team: null }],
});
const notAnswering = ({ q }: PlayersPage): PlayerSearch => ({
  status: "unavailable",
  query: q,
  players: [],
});

/**
 * `/players` as a browser's router has it: the site's five minutes, its way with a query string,
 * and the search's loading around `read`, which stands for the server function.
 */
function site(
  read: (page: PlayersPage) => Promise<PlayerSearch>,
  browser: SearchBrowser | null = { online: () => true, reload: vi.fn() },
) {
  const loading = searchLoading(read, browser);
  const root = createRootRoute();
  const players = createRoute({
    getParentRoute: () => root,
    path: "/players",
    loaderDeps: ({ search }) => readPlayersPage(search),
    loader: { handler: loading.loader, staleReloadMode: "blocking" },
    shouldReload: loading.shouldReload,
  });
  const elsewhere = createRoute({ getParentRoute: () => root, path: "/nhl" });
  const router = createRouter({
    routeTree: root.addChildren([players, elsewhere]),
    history: createMemoryHistory({ initialEntries: ["/nhl"] }),
    // A browser's router, which is the one that keeps what a loader read.
    isServer: false,
    origin: "http://localhost",
    defaultStaleTime: 5 * MINUTE,
    defaultPreloadStaleTime: 5 * MINUTE,
    parseSearch: parseSearchText,
    stringifySearch: stringifySearchText,
  });
  const open = async (href: string) => {
    await router.navigate({ href });
    return router.state.matches.at(-1)?.loaderData as PlayerSearch | undefined;
  };
  return { router, open, loading };
}

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => vi.useRealTimers());

test("a search that was answered is not asked for again inside five minutes", async () => {
  const read = vi.fn(async (page: PlayersPage) => found(page));
  const { router, open } = site(read);
  await router.load();

  expect(await open("/players?q=mar")).toMatchObject({ status: "found", query: "mar" });
  await open("/players?q=mat");
  vi.advanceTimersByTime(4 * MINUTE);
  expect(await open("/players?q=mar")).toMatchObject({ status: "found", query: "mar" });
  await open("/nhl");
  expect(await open("/players?q=mar")).toMatchObject({ status: "found", query: "mar" });

  expect(read.mock.calls.map(([page]) => page.q)).toEqual(["mar", "mat"]);
});

test("after five minutes it is asked for again", async () => {
  const read = vi.fn(async (page: PlayersPage) => found(page));
  const { router, open } = site(read);
  await router.load();

  await open("/players?q=mar");
  await open("/nhl");
  vi.advanceTimersByTime(5 * MINUTE + 1);
  await open("/players?q=mar");
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
});

test("a search ESPN did not answer is asked for again the next time it is loaded", async () => {
  const read = vi.fn(async (page: PlayersPage) => notAnswering(page));
  const { router, open } = site(read);
  await router.load();

  expect(await open("/players?q=mar")).toMatchObject({ status: "unavailable" });
  await open("/players?q=mat");
  read.mockImplementation(async (page) => found(page));
  await open("/players?q=mar");
  await vi.waitFor(() =>
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ status: "found" }),
  );
  expect(read.mock.calls.map(([page]) => page.q)).toEqual(["mar", "mat", "mar"]);

  // Answered now, it is kept like any other; "mat" was not answered either, and is asked again.
  await open("/players?q=mat");
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(4));
  await open("/players?q=mar");
  await open("/players?q=mat");
  expect(read.mock.calls.map(([page]) => page.q)).toEqual(["mar", "mat", "mar", "mat"]);
});

test("a search whose call failed off line says so, and is asked for again", async () => {
  const read = vi.fn(async (_page: PlayersPage): Promise<PlayerSearch> => {
    throw new TypeError("Failed to fetch");
  });
  const browser = { online: () => false, reload: vi.fn() };
  const { router, open } = site(read, browser);
  await router.load();

  expect(await open("/players?q=mar")).toEqual({
    status: "unavailable",
    query: "mar",
    players: [],
  });
  expect(browser.reload).not.toHaveBeenCalled();
  await open("/nhl");
  read.mockImplementation(async (page) => found(page));
  await open("/players?q=mar");
  await vi.waitFor(() =>
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({ status: "found" }),
  );
  expect(read).toHaveBeenCalledTimes(2);
});

test("a search whose call failed on line loads its address as a document, once", async () => {
  const read = vi.fn(async (_page: PlayersPage): Promise<PlayerSearch> => {
    throw new Error('{"status":500,"unhandled":true,"message":"HTTPError"}');
  });
  const browser = { online: () => true, reload: vi.fn() };
  const { router } = site(read, browser);
  await router.load();

  void router.navigate({ href: "/players?q=mar" });
  await vi.waitFor(() => expect(browser.reload).toHaveBeenCalledTimes(1));
  // The address is the search's by then, so the document is the search.
  expect(router.state.location.href).toBe("/players?q=mar");
  expect(read).toHaveBeenCalledTimes(1);
});

test("a page only read ahead is never reloaded for a failed call", async () => {
  const read = vi.fn(async (_page: PlayersPage): Promise<PlayerSearch> => {
    throw new Error("no answer");
  });
  const browser = { online: () => true, reload: vi.fn() };
  const { router } = site(read, browser);
  await router.load();

  await router.preloadRoute({ to: "/players", search: { q: "mar" } });
  expect(read).toHaveBeenCalledTimes(1);
  expect(browser.reload).not.toHaveBeenCalled();
});

test("an answer the server drew as not answering is asked for again too", async () => {
  const read = vi.fn(async (page: PlayersPage) => found(page));
  const { router, open, loading } = site(read);
  await router.load();
  await open("/players?q=mar");
  // As if the document had arrived with "not answering" in it.
  loading.drawn(notAnswering({ q: "mar" }));
  await open("/players?q=mat");
  await open("/players?q=mar");
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(3));
});

test("a search under two characters asks nothing", async () => {
  const read = vi.fn(async (page: PlayersPage) => found(page));
  const { router, open } = site(read);
  await router.load();

  expect(await open("/players")).toEqual({ status: "idle", query: "", players: [] });
  expect(await open("/players?q=m")).toEqual({ status: "idle", query: "m", players: [] });
  expect(read).not.toHaveBeenCalled();
});

test("the address is text: ?q=99, ?q=1e3 and ?q=true are searched as spelled and stay as spelled", async () => {
  const read = vi.fn(async (page: PlayersPage) => found(page));
  const { router, open } = site(read);
  await router.load();

  for (const q of ["99", "1e3", "true"]) {
    expect(await open(`/players?q=${q}`)).toMatchObject({ query: q });
    expect(router.state.location.href).toBe(`/players?q=${q}`);
  }
  await router.navigate({ to: "/players", search: { q: "99" }, replace: true });
  expect(router.state.location.href).toBe("/players?q=99");
  expect(read.mock.calls.map(([page]) => page.q)).toEqual(["99", "1e3", "true"]);
});

test("on the server a failed read is thrown on, for the error page", async () => {
  const failure = new Error("a fault of our own");
  const loading = searchLoading(async () => {
    throw failure;
  }, null);
  await expect(loading.loader({ deps: { q: "mar" }, preload: false })).rejects.toBe(failure);
});
