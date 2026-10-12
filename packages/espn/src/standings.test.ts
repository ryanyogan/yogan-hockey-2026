import { divisionPlace, standingsView } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import { endpoints } from "./endpoints.ts";
import { EspnParseError } from "./errors.ts";
import { loadFixture } from "./fixtures.ts";
import { translateStandings } from "./standings.ts";

const recorded = () => loadFixture(endpoints.standings());

test("every team has a row that says where it plays", async () => {
  const standings = translateStandings(await recorded());

  expect(standings.season).toBe("2026-27");
  expect(standings.rows).toHaveLength(32);
  expect(standings.rows.find((row) => row.team.abbreviation === "TOR")).toMatchObject({
    team: { id: "21", name: "Toronto Maple Leafs" },
    conference: { name: "Eastern Conference", abbreviation: "East" },
    division: { name: "Atlantic Division", abbreviation: "ATL" },
    gamesPlayed: 3,
    wins: 1,
    losses: 2,
    otLosses: 0,
    points: 2,
    goalsFor: 6,
    goalsAgainst: 7,
    goalDifferential: -1,
    regulationWins: 1,
    regulationPlusOvertimeWins: 1,
    streak: "L1",
    homeRecord: "1-2-0",
    roadRecord: "0-0-0",
    lastTen: "1-2-0",
  });
});

test("the rows are enough for all four views", async () => {
  const standings = translateStandings(await recorded());
  const titles = (view: Parameters<typeof standingsView>[1]) =>
    standingsView(standings, view).map((table) => `${table.title} (${table.rows.length})`);

  expect(titles("division")).toEqual([
    "Atlantic Division (8)",
    "Metropolitan Division (8)",
    "Central Division (8)",
    "Pacific Division (8)",
  ]);
  expect(titles("conference")).toEqual(["Eastern Conference (16)", "Western Conference (16)"]);
  expect(titles("league")).toEqual(["National Hockey League (32)"]);
  expect(titles("wildcard")).toEqual([
    "Atlantic Division (3)",
    "Metropolitan Division (3)",
    "Wild Card (10)",
    "Central Division (3)",
    "Pacific Division (3)",
    "Wild Card (10)",
  ]);
});

test("matches the snapshot", async () => {
  expect(translateStandings(await recorded())).toMatchSnapshot();
});

test("a response without the divisions is a parse error naming the endpoint", () => {
  const parse = () => translateStandings({ children: [{ name: "Eastern Conference" }] });

  expect(parse).toThrow(EspnParseError);
  expect(parse).toThrow(/ESPN standings did not parse/);
});

test("every team has a place in its division, one to eight, and no two share one", async () => {
  const standings = translateStandings(await recorded());
  const places = new Map<string, number[]>();
  for (const { team, division } of standings.rows) {
    const place = divisionPlace(standings, team.id);
    expect(place?.row.team.id).toBe(team.id);
    places.set(division.name, [...(places.get(division.name) ?? []), place?.rank ?? 0]);
  }

  expect([...places.keys()]).toHaveLength(4);
  for (const ranks of places.values()) {
    expect(ranks.toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  }
  // Seattle and Utah are listed under the two ids that are not small numbers.
  expect(divisionPlace(standings, "124292")).toMatchObject({
    rank: 3,
    row: { team: { abbreviation: "SEA" }, division: { name: "Pacific Division" } },
  });
  expect(divisionPlace(standings, "129764")).toMatchObject({
    rank: 4,
    row: { team: { abbreviation: "UTA" }, division: { name: "Central Division" } },
  });
});
