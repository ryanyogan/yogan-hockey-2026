import { createMemoryHistory, createRouter, notFound } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "./routeTree.gen";

// The server functions are the routes' only way to the server: each call of one is a request.
vi.mock("./functions/shell", () => ({ readShell: vi.fn(async () => ({})) }));
vi.mock("./functions/nhl", () => ({ readNhl: vi.fn(async () => ({})) }));
vi.mock("./functions/team", () => ({
  readTeamPage: vi.fn(),
  readTeamSchedulePage: vi.fn(),
  readTeamRosterPage: vi.fn(),
  readTeamStatsPage: vi.fn(),
}));
vi.mock("./functions/game", () => ({ readGameRoute: vi.fn(), readReplayPlays: vi.fn() }));
vi.mock("./functions/players", () => ({ readPlayer: vi.fn(), readPlayerGames: vi.fn() }));

const team = await import("./functions/team");
const { readGameRoute } = await import("./functions/game");
const { readPlayer } = await import("./functions/players");

/** What a page's `<head>` is drawn from, after the site's routes are opened at `path`. */
async function headOf(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    isServer: false,
    origin: "http://localhost",
  });
  await router.load();
  const meta = router.state.matches.flatMap((match) => match.meta ?? []);
  return {
    // The last title is the one the document shows (`HeadContent`).
    title: meta.flatMap((tag) => (tag?.title == null ? [] : [tag.title])).at(-1),
    robots: meta.flatMap((tag) => (tag?.name === "robots" ? [tag.content] : [])),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(team.readTeamPage).mockResolvedValue({
    team: { name: "Toronto Maple Leafs" },
  } as never);
  vi.mocked(team.readTeamSchedulePage).mockResolvedValue({} as never);
  vi.mocked(team.readTeamRosterPage).mockResolvedValue([] as never);
});

describe("a page that answers", () => {
  it("says nothing to a search engine", async () => {
    expect(await headOf("/nhl/teams/21")).toEqual({
      title: "Toronto Maple Leafs · Yogan Hockey",
      robots: [],
    });
  });
});

describe("a failure page asks not to be indexed, once", () => {
  it("at an address no route answers", async () => {
    expect(await headOf("/no/such/page")).toEqual({
      title: "Not found · Yogan Hockey",
      robots: ["noindex"],
    });
  });

  it("for a team there is none of", async () => {
    vi.mocked(team.readTeamPage).mockRejectedValue(notFound());
    expect(await headOf("/nhl/teams/999")).toEqual({
      title: "Team not found · Yogan Hockey",
      robots: ["noindex"],
    });
  });

  it("for a game there is none of, on a tab of its own", async () => {
    vi.mocked(readGameRoute).mockRejectedValue(notFound());
    expect(await headOf("/nhl/games/1/scoring")).toEqual({
      title: "Game not found · Yogan Hockey",
      robots: ["noindex"],
    });
  });

  it("for a player there is none of", async () => {
    vi.mocked(readPlayer).mockRejectedValue(notFound());
    expect(await headOf("/players/1")).toEqual({
      title: "Player not found · Yogan Hockey",
      robots: ["noindex"],
    });
  });

  it("when a page's read fails", async () => {
    vi.mocked(team.readTeamPage).mockRejectedValue(new Error("ESPN did not answer"));
    expect(await headOf("/nhl/teams/21")).toEqual({
      title: "Not answering · Yogan Hockey",
      robots: ["noindex"],
    });
  });

  it("when a tab's read fails under a page that answered", async () => {
    vi.mocked(team.readTeamRosterPage).mockRejectedValue(new Error("ESPN did not answer"));
    expect(await headOf("/nhl/teams/21/roster")).toEqual({
      title: "Not answering · Yogan Hockey",
      robots: ["noindex"],
    });
  });
});
