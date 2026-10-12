import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FRESH_FOR } from "./router";
import { routeTree } from "./routeTree.gen";

// The server functions are the routes' only way to the server: each call of one is a request.
vi.mock("./functions/shell", () => ({ readShell: vi.fn(async () => ({})) }));
vi.mock("./functions/nhl", () => ({ readNhl: vi.fn(async () => ({})) }));
vi.mock("./functions/team", () => ({
  readTeamPage: vi.fn(async () => ({ team: { name: "Toronto Maple Leafs" } })),
  readTeamSchedulePage: vi.fn(async () => ({})),
  readTeamRosterPage: vi.fn(async () => []),
  readTeamStatsPage: vi.fn(async () => ({})),
}));

const team = await import("./functions/team");

/** The reads asked for since the last look, by name. */
function asked(): string[] {
  const names = Object.entries(team).flatMap(([name, read]) =>
    vi.mocked(read).mock.calls.map(() => name),
  );
  vi.clearAllMocks();
  return names.sort();
}

/** The site's routes with the freshness `src/router.tsx` gives them, opened at `path`. */
async function open(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultStaleTime: FRESH_FOR,
    // The browser's router, which keeps what it read; the server's reads everything each time.
    isServer: false,
    origin: "http://localhost",
  });
  await router.load();
  return router;
}

type Router = Awaited<ReturnType<typeof open>>;

/** Goes to `path` as a link does. No page is mounted here to start the read, so it is asked for. */
async function go(router: Router, path: string) {
  router.history.push(path);
  await router.load();
}

beforeEach(() => vi.clearAllMocks());

describe("a team's page", () => {
  it("reads the team and the tab it is opened at", async () => {
    await open("/nhl/teams/21/roster");
    expect(asked()).toEqual(["readTeamPage", "readTeamRosterPage"]);
  });

  it("asks for the tab alone when the tab changes, never for the team again", async () => {
    const router = await open("/nhl/teams/21");
    expect(asked()).toEqual(["readTeamPage", "readTeamSchedulePage"]);

    await go(router, "/nhl/teams/21/roster");
    expect(asked()).toEqual(["readTeamRosterPage"]);

    await go(router, "/nhl/teams/21/stats");
    expect(asked()).toEqual(["readTeamStatsPage"]);

    // A tab already read is not asked for again while its read is fresh.
    await go(router, "/nhl/teams/21");
    expect(asked()).toEqual([]);
  });

  it("reads another team's header with that team's tab", async () => {
    const router = await open("/nhl/teams/21/stats");
    asked();
    await go(router, "/nhl/teams/10/stats");
    expect(asked()).toEqual(["readTeamPage", "readTeamStatsPage"]);
  });
});
