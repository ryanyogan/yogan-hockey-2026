import { describe, expect, it } from "vitest";
import { currentNavItem, NAV_ITEMS } from "./nav";

const labelAt = (pathname: string, tab: string | null = null) =>
  currentNavItem(pathname, tab)?.label;

describe("the site navigation", () => {
  it("lists the places in the Parity Reference's order", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "standings",
      "teams",
      "players",
      "family",
      "live scores",
    ]);
  });

  it("marks nothing on the dashboard or on an unknown path", () => {
    expect(labelAt("/")).toBeUndefined();
    expect(labelAt("/nowhere")).toBeUndefined();
  });

  it("tells Standings from Teams by the tab held in the URL", () => {
    expect(labelAt("/nhl")).toBe("standings");
    expect(labelAt("/nhl", "standings")).toBe("standings");
    expect(labelAt("/nhl", "teams")).toBe("teams");
  });

  it("marks Teams on a team's page", () => {
    expect(labelAt("/nhl/teams/10")).toBe("teams");
  });

  it("marks Live Scores on the live page and on a game's page", () => {
    expect(labelAt("/nhl/live")).toBe("live scores");
    expect(labelAt("/nhl/games/401")).toBe("live scores");
  });

  it("marks Players on the search and on a player's page", () => {
    expect(labelAt("/players")).toBe("players");
    expect(labelAt("/players/3114727")).toBe("players");
  });

  it("marks Family on Rylan's page", () => {
    expect(labelAt("/family/rylan")).toBe("family");
  });

  it("does not match a path that merely starts with the same letters", () => {
    expect(labelAt("/playersx")).toBeUndefined();
  });
});
