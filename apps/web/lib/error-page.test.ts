import { describe, expect, it } from "vitest";
import { unreadPage } from "./error-page";

describe("the error page's words for a path", () => {
  it("names a team and leads back to the teams", () => {
    expect(unreadPage("/nhl/teams/1")).toEqual({
      title: "Team",
      subject: "this team",
      back: { href: "/nhl?tab=teams", label: "all teams" },
    });
  });

  it("names a player and leads back to the player search", () => {
    expect(unreadPage("/players/4024123")).toEqual({
      title: "Player",
      subject: "this player",
      back: { href: "/players", label: "all players" },
    });
  });

  it("names a game and leads back to the live scores", () => {
    expect(unreadPage("/nhl/games/401803652")).toEqual({
      title: "Game",
      subject: "this game",
      back: { href: "/nhl/live", label: "live scores" },
    });
  });

  it("names the standings and the teams, which share /nhl, and leads back to tonight", () => {
    expect(unreadPage("/nhl")).toEqual({
      title: "NHL",
      subject: "the standings and teams",
      back: { href: "/", label: "tonight" },
    });
  });

  it("leads anywhere else back to tonight", () => {
    for (const pathname of ["/players", "/nhl/live", "/family/rylan", "/nowhere/at/all"]) {
      expect(unreadPage(pathname)).toEqual({
        title: "Page",
        subject: "this page",
        back: { href: "/", label: "tonight" },
      });
    }
  });

  it("does not lead the dashboard back to itself", () => {
    expect(unreadPage("/").back).toEqual({ href: "/nhl/live", label: "live scores" });
  });

  it("is not fooled by a path that only starts like another", () => {
    expect(unreadPage("/nhl/teamsters").title).toBe("Page");
    expect(unreadPage("/playersx/1").title).toBe("Page");
  });
});
