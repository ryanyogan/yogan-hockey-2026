import { describe, expect, test } from "vitest";
import type { Standings, StandingsRow } from "./standings.ts";
import { standingsView } from "./standings-views.ts";

const EAST = { name: "Eastern Conference", abbreviation: "East" };
const WEST = { name: "Western Conference", abbreviation: "West" };
const ATLANTIC = { name: "Atlantic Division", abbreviation: "ATL" };
const METRO = { name: "Metropolitan Division", abbreviation: "MET" };
const CENTRAL = { name: "Central Division", abbreviation: "CEN" };

function row(
  abbreviation: string,
  conference: StandingsRow["conference"],
  division: StandingsRow["division"],
  points: number,
  rest: Partial<StandingsRow> = {},
): StandingsRow {
  return {
    team: {
      id: abbreviation,
      abbreviation,
      name: abbreviation,
      shortName: abbreviation,
      location: abbreviation,
      color: null,
      logo: null,
      logoDark: null,
    },
    conference,
    division,
    gamesPlayed: 10,
    wins: 0,
    losses: 0,
    otLosses: 0,
    points,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifferential: 0,
    regulationWins: 0,
    regulationPlusOvertimeWins: 0,
    streak: "W1",
    homeRecord: "0-0-0",
    roadRecord: "0-0-0",
    lastTen: "0-0-0",
    ...rest,
  };
}

// Listed worst first, so nothing passes by keeping the order it was given.
const standings: Standings = {
  season: "2026-27",
  rows: [
    row("A5", EAST, ATLANTIC, 8),
    row("A4", EAST, ATLANTIC, 11),
    row("A3", EAST, ATLANTIC, 12),
    row("A2", EAST, ATLANTIC, 14),
    row("A1", EAST, ATLANTIC, 20),
    row("M5", EAST, METRO, 9),
    row("M4", EAST, METRO, 13),
    row("M3", EAST, METRO, 15),
    row("M2", EAST, METRO, 16),
    row("M1", EAST, METRO, 18),
    row("C2", WEST, CENTRAL, 5),
    row("C1", WEST, CENTRAL, 30),
  ],
};

function teams(rows: StandingsRow[]): string[] {
  return rows.map((entry) => entry.team.abbreviation);
}

describe("the League view", () => {
  test("is one table of every team, most points first", () => {
    const [league, ...others] = standingsView(standings, "league");

    expect(others).toEqual([]);
    expect(teams(league?.rows ?? [])).toEqual([
      ...["C1", "A1", "M1", "M2", "M3", "A2"],
      ...["M4", "A3", "A4", "M5", "A5", "C2"],
    ]);
  });
});

describe("the Conference view", () => {
  test("is one table per conference, with no playoff line", () => {
    const view = standingsView(standings, "conference");

    expect(view.map((group) => group.title)).toEqual(["Eastern Conference", "Western Conference"]);
    expect(teams(view[0]?.rows ?? [])).toEqual([
      ...["A1", "M1", "M2", "M3", "A2"],
      ...["M4", "A3", "A4", "M5", "A5"],
    ]);
    expect(view[0]?.playoffSpots).toBeNull();
  });
});

describe("the Division view", () => {
  test("is one table per division, under its conference, with three playoff places", () => {
    const view = standingsView(standings, "division");

    expect(view.map((group) => [group.conference, group.title, group.playoffSpots])).toEqual([
      ["Eastern Conference", "Atlantic Division", 3],
      ["Eastern Conference", "Metropolitan Division", 3],
      ["Western Conference", "Central Division", 3],
    ]);
    expect(teams(view[0]?.rows ?? [])).toEqual(["A1", "A2", "A3", "A4", "A5"]);
  });
});

describe("the Wild Card view", () => {
  test("shows each division's top three, then the rest of the conference racing for two places", () => {
    const east = standingsView(standings, "wildcard").filter(
      (group) => group.conference === "Eastern Conference",
    );

    expect(east.map((group) => [group.title, teams(group.rows), group.playoffSpots])).toEqual([
      ["Atlantic Division", ["A1", "A2", "A3"], 3],
      ["Metropolitan Division", ["M1", "M2", "M3"], 3],
      ["Wild Card", ["M4", "A4", "M5", "A5"], 2],
    ]);
  });
});

describe("teams level on points", () => {
  function leagueOrder(rows: StandingsRow[]): string[] {
    return teams(standingsView({ season: "2026-27", rows }, "league")[0]?.rows ?? []);
  }

  test("the one with fewer games played ranks higher", () => {
    expect(
      leagueOrder([
        row("MORE", EAST, ATLANTIC, 10, { gamesPlayed: 9 }),
        row("FEWER", EAST, ATLANTIC, 10, { gamesPlayed: 8 }),
      ]),
    ).toEqual(["FEWER", "MORE"]);
  });

  test("then the one with more regulation wins, then more regulation and overtime wins", () => {
    expect(
      leagueOrder([
        row("THIRD", EAST, ATLANTIC, 10, { regulationWins: 3, regulationPlusOvertimeWins: 3 }),
        row("SECOND", EAST, ATLANTIC, 10, { regulationWins: 3, regulationPlusOvertimeWins: 4 }),
        row("FIRST", EAST, ATLANTIC, 10, { regulationWins: 4, regulationPlusOvertimeWins: 4 }),
      ]),
    ).toEqual(["FIRST", "SECOND", "THIRD"]);
  });
});
