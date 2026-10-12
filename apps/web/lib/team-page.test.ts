import { describe, expect, it } from "vitest";
import { isTeamId, teamPageHref, teamPlace, teamStandingLine, teamTabOfPath } from "./team-page";

describe("where a team plays, for the line over its name", () => {
  const standing = {
    conference: { name: "Eastern Conference", abbreviation: "East" },
    division: { name: "Atlantic Division", abbreviation: "ATL" },
  };

  it("is its city, then its conference and division", () => {
    expect(teamPlace({ location: "Toronto" }, standing)).toEqual([
      "Toronto",
      "Eastern Conference",
      "Atlantic Division",
    ]);
  });

  it("is the city alone when the standings could not be read", () => {
    expect(teamPlace({ location: "Toronto" }, null)).toEqual(["Toronto"]);
  });
});

describe("where a team stands, for the header's record", () => {
  const standing = (divisionRank: number, name = "Atlantic Division") => ({
    conference: { name: "Eastern Conference", abbreviation: "East" },
    division: { name, abbreviation: "ATL" },
    divisionRank,
  });

  it("is its place in its division, in the words ESPN's summary had", () => {
    expect(teamStandingLine(standing(6))).toBe("6th in Atlantic Division");
    expect(teamStandingLine(standing(1, "Central Division"))).toBe("1st in Central Division");
    expect(teamStandingLine(standing(2))).toBe("2nd in Atlantic Division");
    expect(teamStandingLine(standing(3))).toBe("3rd in Atlantic Division");
    expect(teamStandingLine(standing(8))).toBe("8th in Atlantic Division");
  });

  it("is a dash for a team the standings do not list, or when they could not be read", () => {
    expect(teamStandingLine(null)).toBe("-");
  });
});

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
