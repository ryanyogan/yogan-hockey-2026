import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { ADDRESS_RULES } from "./router";
import { routeTree } from "./routeTree.gen";

vi.mock("./functions/shell", () => ({ readShell: vi.fn(async () => ({})) }));
vi.mock("./functions/nhl", () => ({ readNhl: vi.fn(async () => ({})) }));
vi.mock("./functions/team", () => ({
  readTeamPage: vi.fn(async () => ({ team: { name: "Toronto Maple Leafs" } })),
  readTeamSchedulePage: vi.fn(async () => ({})),
  readTeamRosterPage: vi.fn(async () => []),
  readTeamStatsPage: vi.fn(async () => ({})),
}));

const team = await import("./functions/team");

/** The routes that answer `path`, by id, or "not found" when none does; null when the server's router redirects. */
async function answers(path: string, isServer: boolean) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    ...ADDRESS_RULES,
    isServer,
    origin: "http://localhost",
  });
  await router.load();
  const { matches } = router.state;
  // The server's router keeps no match when it redirects.
  if (matches.length === 0) return null;
  // `_notFound` is the router's mark on the root for an address no route answers (`src/head.ts`).
  if (matches.some((match) => match._notFound === true)) return "not found";
  return matches.at(-1)?.routeId;
}

// Start's server for a first load, the browser's router for a navigation.
describe.each([
  ["on the server", true],
  ["in the browser", false],
])("an address %s", (_where, isServer) => {
  it("is matched by case, as the site before the port matched it", async () => {
    for (const path of ["/NHL", "/Players", "/nhl/Live", "/PICKS", "/nhl/teams/21/Roster"])
      expect(await answers(path, isServer), path).toBe("not found");
  });

  it("is answered as before where it is spelled as the route is", async () => {
    expect(await answers("/nhl", isServer)).toBe("/nhl/");
    expect(await answers("/nhl/teams/21", isServer)).toBe("/nhl/teams/$id/");
    expect(await answers("/nhl/teams/21/roster", isServer)).toBe("/nhl/teams/$id/roster");
    expect(await answers("/picks", isServer)).toBe("/picks");
  });

  // What the Worker hands the site for `/nhl/teams/%20` (`lib/canonical-address.ts`): the team's
  // page asked for with a space for an id (which the team's read answers "not found":
  // `lib/find-team.ts`), and no redirect.
  it("keeps an id that is a space when the Worker has put a slash after it", async () => {
    expect(await answers("/nhl/teams/%20/", isServer)).toBe("/nhl/teams/$id/");
    expect(vi.mocked(team.readTeamPage)).toHaveBeenLastCalledWith({ data: { id: " " } });
  });
});
