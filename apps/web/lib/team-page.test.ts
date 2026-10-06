import { describe, expect, it } from "vitest";
import { isTeamId, readTeamPage, teamPageHref } from "./team-page";

describe("reading a team page's query string", () => {
  it("shows the schedule when the URL says nothing", () => {
    expect(readTeamPage({})).toEqual({ tab: "schedule" });
  });

  it("takes the tab from the URL", () => {
    expect(readTeamPage({ tab: "roster" })).toEqual({ tab: "roster" });
    expect(readTeamPage({ tab: "stats" })).toEqual({ tab: "stats" });
    expect(readTeamPage({ tab: "schedule" })).toEqual({ tab: "schedule" });
  });

  it("falls back to the schedule for an unknown tab", () => {
    expect(readTeamPage({ tab: "lines" })).toEqual({ tab: "schedule" });
    expect(readTeamPage({ tab: "" })).toEqual({ tab: "schedule" });
    // The URL is matched as written: "Roster" is not a tab.
    expect(readTeamPage({ tab: "Roster" })).toEqual({ tab: "schedule" });
  });

  it("reads the first value when the tab is given twice", () => {
    expect(readTeamPage({ tab: ["stats", "roster"] })).toEqual({ tab: "stats" });
  });
});

describe("links within a team page", () => {
  it("leaves the default tab out of the URL", () => {
    expect(teamPageHref("21", "schedule")).toBe("/nhl/teams/21");
  });

  it("names any other tab", () => {
    expect(teamPageHref("21", "roster")).toBe("/nhl/teams/21?tab=roster");
    expect(teamPageHref("13", "stats")).toBe("/nhl/teams/13?tab=stats");
  });

  it("reads back every address it writes", () => {
    for (const tab of ["schedule", "roster", "stats"] as const) {
      const query = Object.fromEntries(new URL(teamPageHref("21", tab), "http://x").searchParams);
      expect(readTeamPage(query)).toEqual({ tab });
    }
  });
});

describe("what can be a team's id", () => {
  it("is digits, as ESPN's ids are", () => {
    expect(isTeamId("21")).toBe(true);
    expect(isTeamId("124292")).toBe(true);
  });

  it("is nothing else, so a mistyped address is a missing team and not a failed request", () => {
    expect(isTeamId("leafs")).toBe(false);
    expect(isTeamId("21abc")).toBe(false);
    expect(isTeamId("")).toBe(false);
    expect(isTeamId("2 1")).toBe(false);
  });
});
