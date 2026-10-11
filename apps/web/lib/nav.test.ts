import { describe, expect, it } from "vitest";
import { currentNavItem, NAV_ITEMS, navItemByPathAlone } from "./nav";

const labelAt = (pathname: string, tab: string | null = null) =>
  currentNavItem(pathname, tab)?.label;

describe("the site navigation", () => {
  it("keeps the five primary pages visible in the approved order", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Home",
      "Scores",
      "Standings",
      "Teams",
      "Players",
    ]);
  });

  it("marks Home on the dashboard and nothing on an unknown path", () => {
    expect(labelAt("/")).toBe("Home");
    expect(labelAt("/nowhere")).toBeUndefined();
  });

  it("tells Standings from Teams by the tab held in the URL", () => {
    expect(labelAt("/nhl")).toBe("Standings");
    expect(labelAt("/nhl", "standings")).toBe("Standings");
    expect(labelAt("/nhl", "teams")).toBe("Teams");
  });

  it("marks Teams on a team's page", () => {
    expect(labelAt("/nhl/teams/10")).toBe("Teams");
  });

  it("marks Live Scores on the live page and on a game's page", () => {
    expect(labelAt("/nhl/live")).toBe("Scores");
    expect(labelAt("/nhl/games/401")).toBe("Scores");
  });

  it("marks Players on the search and on a player's page", () => {
    expect(labelAt("/players")).toBe("Players");
    expect(labelAt("/players/3114727")).toBe("Players");
  });

  it("keeps the place marked on the pages under a game, a team and a player", () => {
    expect(labelAt("/nhl/games/401/scoring")).toBe("Scores");
    expect(labelAt("/nhl/games/401/pick")).toBe("Scores");
    expect(labelAt("/nhl/teams/10/roster")).toBe("Teams");
    expect(labelAt("/nhl/teams/10/stats")).toBe("Teams");
    expect(labelAt("/players/3114727/games")).toBe("Players");
  });

  it("marks no place on the sample pages", () => {
    expect(labelAt("/skeleton/live")).toBeUndefined();
  });

  it("knows the place from the path alone wherever the query string cannot change it", () => {
    expect(navItemByPathAlone("/")?.label).toBe("Home");
    expect(navItemByPathAlone("/nhl/live")?.label).toBe("Scores");
    expect(navItemByPathAlone("/nhl/games/401/scoring")?.label).toBe("Scores");
    expect(navItemByPathAlone("/nhl/teams/10")?.label).toBe("Teams");
    expect(navItemByPathAlone("/players/3114727")?.label).toBe("Players");
    expect(navItemByPathAlone("/nowhere")).toBeUndefined();
  });

  it("marks neither Standings nor Teams from the path they share", () => {
    expect(navItemByPathAlone("/nhl")).toBeUndefined();
  });

  it("does not advertise retired Family pages", () => {
    expect(labelAt("/family/rylan")).toBeUndefined();
  });

  it("does not match a path that merely starts with the same letters", () => {
    expect(labelAt("/playersx")).toBeUndefined();
  });
});
