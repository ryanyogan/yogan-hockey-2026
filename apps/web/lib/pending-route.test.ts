import { describe, expect, it } from "vitest";
import { pendingOutline } from "./pending-route";

describe("the outline drawn the moment a link is tapped", () => {
  it("is the next page's own, for a page of another kind", () => {
    expect(pendingOutline("/", "/nhl/games/401803652")).toEqual({ scope: "page", outline: "game" });
    expect(pendingOutline("/nhl", "/nhl/teams/21")).toEqual({
      scope: "page",
      outline: "team-schedule",
    });
    expect(pendingOutline("/players", "/players/4024123")).toEqual({
      scope: "page",
      outline: "player",
    });
    expect(pendingOutline("/nhl/teams/21", "/")).toEqual({ scope: "page", outline: "home" });
    expect(pendingOutline("/", "/nhl/live")).toEqual({ scope: "page", outline: "live" });
    expect(pendingOutline("/", "/nhl")).toEqual({ scope: "page", outline: "standings" });
    expect(pendingOutline("/", "/players")).toEqual({ scope: "page", outline: "players" });
  });

  it("opens a team on the tab the link names", () => {
    expect(pendingOutline("/players/4024123", "/nhl/teams/21/roster")).toEqual({
      scope: "page",
      outline: "team-roster",
    });
    expect(pendingOutline("/nhl", "/nhl/teams/21/stats")).toEqual({
      scope: "page",
      outline: "team-stats",
    });
  });

  it("is only the tab's, between tabs of one team, game or player, whose header stays", () => {
    expect(pendingOutline("/nhl/teams/21", "/nhl/teams/21/roster")).toEqual({
      scope: "tab",
      outline: "team-roster",
    });
    expect(pendingOutline("/nhl/teams/21/roster", "/nhl/teams/21")).toEqual({
      scope: "tab",
      outline: "team-schedule",
    });
    expect(pendingOutline("/nhl/games/401803652", "/nhl/games/401803652/scoring")).toEqual({
      scope: "tab",
      outline: "game-tab",
    });
    expect(pendingOutline("/players/4024123", "/players/4024123/games")).toEqual({
      scope: "tab",
      outline: "player-games",
    });
  });

  it("is the whole page's between two teams, two games or two players", () => {
    expect(pendingOutline("/nhl/teams/21", "/nhl/teams/5/roster")).toEqual({
      scope: "page",
      outline: "team-roster",
    });
    expect(pendingOutline("/players/1", "/players/2")).toEqual({
      scope: "page",
      outline: "player",
    });
  });

  it("is drawn for the same page asked a different question", () => {
    expect(pendingOutline("/nhl", "/nhl?tab=teams")).toEqual({
      scope: "page",
      outline: "standings",
    });
    expect(pendingOutline("/players", "/players?q=mar")).toEqual({
      scope: "page",
      outline: "players",
    });
  });

  it("is nothing for the page already shown, a place on it, or a page with no outline", () => {
    expect(pendingOutline("/nhl?tab=teams", "/nhl?tab=teams")).toBeNull();
    expect(pendingOutline("/nhl", "/nhl#east")).toBeNull();
    expect(pendingOutline("/", "/skeleton/live")).toBeNull();
    expect(pendingOutline("/", "https://www.espn.com/nhl")).toBeNull();
    expect(pendingOutline("/", "//example.com/nhl")).toBeNull();
    expect(pendingOutline("/", "/nhl/teams/21/unknown")).toBeNull();
  });
});
