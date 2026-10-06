import { describe, expect, it } from "vitest";
import { isTeamId, legacyTeamTabRedirects, teamPageHref, teamTabOfPath } from "./team-page";

describe("the address of each tab of a team's page", () => {
  it("is the team's own address for the schedule", () => {
    expect(teamPageHref("21", "schedule")).toBe("/nhl/teams/21");
  });

  it("is a segment under it for any other tab", () => {
    expect(teamPageHref("21", "roster")).toBe("/nhl/teams/21/roster");
    expect(teamPageHref("13", "stats")).toBe("/nhl/teams/13/stats");
  });
});

describe("which tab a path is", () => {
  it("reads back every address it writes", () => {
    for (const tab of ["schedule", "roster", "stats"] as const) {
      expect(teamTabOfPath(teamPageHref("21", tab))).toBe(tab);
    }
  });

  it("is the schedule for anything else", () => {
    expect(teamTabOfPath("/nhl/teams/21/")).toBe("schedule");
    expect(teamTabOfPath("/nhl/teams/21/lines")).toBe("schedule");
    expect(teamTabOfPath("/nhl")).toBe("schedule");
  });
});

describe("the addresses tabs had while they were in the query string", () => {
  const redirects = legacyTeamTabRedirects();

  it("send each tab but the schedule, which has not moved, to its new address", () => {
    expect(redirects).toEqual([
      {
        source: "/nhl/teams/:id",
        has: [{ type: "query", key: "tab", value: "roster" }],
        destination: "/nhl/teams/:id/roster",
        permanent: true,
      },
      {
        source: "/nhl/teams/:id",
        has: [{ type: "query", key: "tab", value: "stats" }],
        destination: "/nhl/teams/:id/stats",
        permanent: true,
      },
    ]);
  });
});

describe("what can be a team's id", () => {
  it("is digits, as ESPN's ids are", () => {
    expect(isTeamId("21")).toBe(true);
    expect(isTeamId("124292")).toBe(true);
  });

  it("is nothing else", () => {
    expect(isTeamId("leafs")).toBe(false);
    expect(isTeamId("21a")).toBe(false);
    expect(isTeamId("")).toBe(false);
  });
});
