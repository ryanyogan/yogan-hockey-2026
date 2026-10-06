import { describe, expect, it } from "vitest";
import { nhlHref, readNhlPage } from "./nhl-page";

describe("reading /nhl's query string", () => {
  it("shows the standings by division when the URL says nothing", () => {
    expect(readNhlPage({})).toEqual({ tab: "standings", view: "division" });
  });

  it("takes the tab and the view from the URL", () => {
    expect(readNhlPage({ tab: "teams" })).toEqual({ tab: "teams", view: "division" });
    expect(readNhlPage({ view: "wildcard" })).toEqual({ tab: "standings", view: "wildcard" });
    expect(readNhlPage({ tab: "standings", view: "league" })).toEqual({
      tab: "standings",
      view: "league",
    });
    expect(readNhlPage({ view: "conference" }).view).toBe("conference");
  });

  it("falls back to the standings for an unknown tab, and to divisions for an unknown view", () => {
    expect(readNhlPage({ tab: "rosters", view: "galaxy" })).toEqual({
      tab: "standings",
      view: "division",
    });
    expect(readNhlPage({ tab: "", view: "" })).toEqual({ tab: "standings", view: "division" });
    // The URL is matched as written: "Teams" is not a tab.
    expect(readNhlPage({ tab: "Teams" }).tab).toBe("standings");
  });

  it("reads the first value when a parameter is repeated", () => {
    expect(readNhlPage({ tab: ["teams", "standings"], view: ["league", "division"] })).toEqual({
      tab: "teams",
      view: "league",
    });
  });
});

describe("links within /nhl", () => {
  it("leaves the defaults out of the URL", () => {
    expect(nhlHref({ tab: "standings", view: "division" })).toBe("/nhl");
  });

  it("holds the view of the standings", () => {
    expect(nhlHref({ tab: "standings", view: "wildcard" })).toBe("/nhl?view=wildcard");
  });

  it("holds the Teams tab, which has no views", () => {
    expect(nhlHref({ tab: "teams", view: "league" })).toBe("/nhl?tab=teams");
  });

  it("round-trips every tab and view through the URL", () => {
    for (const tab of ["standings", "teams"] as const) {
      for (const view of ["division", "conference", "wildcard", "league"] as const) {
        const query = Object.fromEntries(
          new URL(nhlHref({ tab, view }), "http://x").searchParams.entries(),
        );
        const read = readNhlPage(query);
        expect(read.tab).toBe(tab);
        if (tab === "standings") expect(read.view).toBe(view);
      }
    }
  });
});
