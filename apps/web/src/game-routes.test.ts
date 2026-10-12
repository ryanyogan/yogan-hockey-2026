import { createMemoryHistory, createRouter, notFound } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "./routeTree.gen";

// The server functions are the routes' only way to the server: each call of one is a request.
vi.mock("./functions/shell", () => ({ readShell: vi.fn(async () => ({})) }));
vi.mock("./functions/nhl", () => ({ readNhl: vi.fn(async () => ({})) }));
vi.mock("./functions/game", () => ({
  readGameRoute: vi.fn(async () => ({ state: "unreadable" })),
  readReplayPlays: vi.fn(async () => null),
}));

const { readGameRoute } = await import("./functions/game");

/** How many times the game was asked for since the last look. */
function gameReads(): number {
  const reads = vi.mocked(readGameRoute).mock.calls.length;
  vi.mocked(readGameRoute).mockClear();
  return reads;
}

/**
 * The site's routes in the browser's router, opened at `path`. Nothing a loader read is fresh
 * here (the site's own five minutes are `src/router.tsx`'s), so whatever is not read again is
 * not read again however long the page has been open. That a route stayed on is left alone when
 * its read is old is the router's own rule (router-core 1.171, `load-client.ts`: a stale match is
 * read again when entered, or when the same address is loaded again), which these tests hold a
 * router upgrade to.
 */
async function open(path: string, staleTime = 0) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultStaleTime: staleTime,
    // The browser's router, which keeps what it read; the server's reads everything each time.
    isServer: false,
    origin: "http://localhost",
  });
  await router.load();
  return router;
}

/** Goes to `path` as a link does. No page is mounted here to start the read, so it is asked for. */
async function go(router: Awaited<ReturnType<typeof open>>, path: string) {
  router.history.push(path);
  await router.load();
}

beforeEach(() => vi.clearAllMocks());

describe("a game's page", () => {
  it.each(["/nhl/games/401", "/nhl/games/401/scoring", "/nhl/games/401/pick"])(
    "reads the game once when opened at %s",
    async (path) => {
      await open(path);
      expect(readGameRoute).toHaveBeenCalledExactlyOnceWith({ data: { id: "401" } });
    },
  );

  it("asks for nothing when the tab changes, however old its read", async () => {
    const router = await open("/nhl/games/401");
    expect(gameReads()).toBe(1);

    for (const tab of ["/scoring", "/pick", "", "/scoring"]) {
      await go(router, `/nhl/games/401${tab}`);
      expect(router.state.location.pathname).toBe(`/nhl/games/401${tab}`);
      expect(gameReads()).toBe(0);
    }
  });

  it("reads the game again when the Scoreboard says what was read is out of date", async () => {
    const router = await open("/nhl/games/401/scoring");
    gameReads();
    await router.invalidate();
    expect(gameReads()).toBe(1);
  });

  it("reads the game again when it is come back to from another page", async () => {
    const router = await open("/nhl/games/401");
    gameReads();
    await go(router, "/nhl");
    await go(router, "/nhl/games/401/scoring");
    expect(gameReads()).toBe(1);
  });

  // The route draws one of two not-found pages by these marks (`routes/nhl/games/$id/route.tsx`),
  // and the second is the router's own, with no public name.
  it("marks a game that does not exist as its own read's not-found", async () => {
    vi.mocked(readGameRoute).mockRejectedValueOnce(notFound());
    const router = await open("/nhl/games/not-a-game");
    const game = router.state.matches.find((match) => match.routeId === "/nhl/games/$id");
    expect(game?.status).toBe("notFound");
  });

  it("marks an address under a game that no route answers, with the game read", async () => {
    const router = await open("/nhl/games/401/coaches");
    const game = router.state.matches.find((match) => match.routeId === "/nhl/games/$id");
    expect(game).toMatchObject({ status: "success", _notFound: true });
  });

  it("keeps a game that was read for the site's five minutes", async () => {
    const found = { state: "found" } as Awaited<ReturnType<typeof readGameRoute>>;
    vi.mocked(readGameRoute).mockResolvedValueOnce(found);
    const router = await open("/nhl/games/401", 5 * 60 * 1000);
    await go(router, "/nhl");
    await go(router, "/nhl/games/401");
    expect(gameReads()).toBe(1);
  });

  it("reads another game for another game's address", async () => {
    const router = await open("/nhl/games/401/scoring");
    gameReads();
    await go(router, "/nhl/games/402/scoring");
    expect(readGameRoute).toHaveBeenCalledExactlyOnceWith({ data: { id: "402" } });
  });
});
