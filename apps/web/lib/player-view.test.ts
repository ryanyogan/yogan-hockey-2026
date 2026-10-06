import type { PlayerCareer, PlayerGameLog, PlayerProfile } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import { bioFacts, careerView, gameLogView, seasonView } from "./player-view";

const TOR = { id: "21", abbreviation: "TOR", name: "Toronto Maple Leafs" };
const CHI = { id: "4", abbreviation: "CHI", name: "Chicago Blackhawks" };
const OTT = { id: "14", abbreviation: "OTT", name: "Ottawa Senators" };

const columns = (...pairs: [name: string, label: string][]) =>
  pairs.map(([name, label]) => ({ name, label }));

const skaterCareer: PlayerCareer = {
  playerId: "1",
  columns: columns(
    ["games", "GP"],
    ["goals", "G"],
    ["assists", "A"],
    ["points", "PTS"],
    ["plusMinus", "+/-"],
    ["penaltyMinutes", "PIM"],
    ["shootoutGoals", "SOG"],
    ["shootingPct", "SPCT"],
    ["powerPlayGoals", "PPG"],
    ["powerPlayAssists", "PPA"],
    ["gameWinningGoals", "GWG"],
    ["timeOnIcePerGame", "TOI/G"],
    ["production", "PROD"],
  ),
  seasons: [
    {
      year: 2025,
      season: "24-25",
      team: TOR,
      values: ["80", "40", "40", "80", "10", "20", "1", "12.5", "9", "8", "5", "20:00", "20:00"],
    },
    {
      year: 2026,
      season: "25-26",
      team: TOR,
      values: ["40", "10", "10", "20", "-2", "8", "0", "9.0", "2", "3", "1", "19:00", "38:00"],
    },
    {
      year: 2026,
      season: "25-26",
      team: CHI,
      values: ["20", "5", "5", "10", "1", "4", "0", "8.0", "1", "1", "0", "18:00", "36:00"],
    },
    {
      year: 2026,
      season: "25-26",
      team: null,
      values: ["60", "15", "15", "30", "-1", "12", "0", "8.7", "3", "4", "1", "18:40", "37:20"],
    },
    {
      year: 2027,
      season: "26-27",
      team: CHI,
      values: ["3", "1", "0", "1", "-1", "2", "0", "10.0", "1", "0", "0", "21:29", "64:28"],
    },
  ],
  totals: ["143", "56", "55", "111", "8", "34", "1", "11.0", "13", "12", "6", "19:30", "25:00"],
};

const goalieCareer: PlayerCareer = {
  playerId: "2",
  columns: columns(
    ["games", "GP"],
    ["gameStarted", "GS"],
    ["wins", "WINS"],
    ["losses", "L"],
    ["overtimeLosses", "OTL"],
    ["avgGoalsAgainst", "GAA"],
    ["savePct", "SV%"],
    ["shutouts", "SO"],
  ),
  seasons: [
    {
      year: 2027,
      season: "26-27",
      team: TOR,
      values: ["1", "1", "1", "0", "0", "1.03", ".963", "0"],
    },
  ],
  totals: ["169", "142", "75", "49", "15", "2.65", ".914", "12"],
};

const profile = (over: Partial<PlayerProfile>): PlayerProfile => ({
  id: "1",
  name: "Sample Skater",
  firstName: "Sample",
  lastName: "Skater",
  jersey: "34",
  position: "C",
  positionName: "Center",
  headshot: null,
  team: null,
  height: `6' 3"`,
  weight: "214 lbs",
  birthDate: "1997-09-17",
  age: 29,
  birthPlace: "San Ramon, CA",
  draft: "2016: Rd 1, Pk 1 (TOR)",
  experience: "11th Season",
  hand: "Left",
  active: true,
  seasonSummary: {
    title: "2026-27 regular season stats",
    stats: [
      { name: "goals", label: "G", value: "1", rank: "Tied-47th" },
      { name: "points", label: "PTS", value: "1", rank: null },
    ],
  },
  ...over,
});

const skaterLog: PlayerGameLog = {
  playerId: "1",
  season: "2026-27 Regular Season",
  columns: columns(
    ["goals", "G"],
    ["shotsTotal", "S"],
    ["shootingPct", "SPCT"],
    ["timeOnIcePerGame", "TOI/G"],
    ["production", "PROD"],
  ),
  games: [
    {
      gameId: "30",
      // Seven in the evening in Toronto on the 3rd, already the 4th in UTC.
      startTime: "2026-10-04T02:00:00.000Z",
      home: false,
      opponent: OTT,
      result: "L",
      goalsFor: 2,
      goalsAgainst: 3,
      values: ["1", "6", "16.7", "21:50", "21:50"],
    },
    {
      gameId: "20",
      startTime: "2026-09-30T23:30:00.000Z",
      home: true,
      opponent: OTT,
      result: "W",
      goalsFor: 2,
      goalsAgainst: 1,
      values: ["0", "1", "0.0", "20:04", "0:00"],
    },
    {
      gameId: "10",
      startTime: "2026-09-28T23:30:00.000Z",
      home: true,
      opponent: OTT,
      result: "W",
      goalsFor: 5,
      goalsAgainst: 1,
      values: ["0", "3", "0.0", "22:33", "0:00"],
    },
  ],
};

const emptyCareer: PlayerCareer = { playerId: "3", columns: [], seasons: [], totals: [] };
const emptyLog: PlayerGameLog = { playerId: "3", season: null, columns: [], games: [] };

test("a career reads newest first, a split season's total ahead of its clubs", () => {
  const view = careerView(skaterCareer);

  expect(view?.rows.map((row) => [row.season, row.team?.abbreviation ?? "total"])).toEqual([
    ["26-27", "CHI"],
    ["25-26", "total"],
    ["25-26", "CHI"],
    ["25-26", "TOR"],
    ["24-25", "TOR"],
  ]);
  // Three seasons, though five rows.
  expect(view?.seasonCount).toBe(3);
});

test("a skater's career columns say what they hold", () => {
  const view = careerView(skaterCareer);

  // ESPN's "SOG" is shootout goals and "SPCT" a shooting percentage; "PROD" is dropped.
  expect(view?.columns.map((column) => column.label)).toEqual([
    "GP",
    "G",
    "A",
    "PTS",
    "+/-",
    "PIM",
    "S/O G",
    "S%",
    "PPG",
    "PPA",
    "GWG",
    "TOI/G",
  ]);
  expect(view?.rows[0]?.values).toEqual([
    "3",
    "1",
    "0",
    "1",
    "-1",
    "2",
    "0",
    "10.0",
    "1",
    "0",
    "0",
    "21:29",
  ]);
  expect(view?.totals).toHaveLength(12);
  expect(view?.totals?.[3]).toBe("111");
});

test("a skater's career headline has his totals and points per game", () => {
  expect(careerView(skaterCareer)?.headline).toEqual([
    { label: "GP", value: "143" },
    { label: "G", value: "56" },
    { label: "A", value: "55" },
    { label: "PTS", value: "111" },
    // 111 points in 143 games.
    { label: "P/GP", value: "0.78" },
  ]);
});

test("a goalie's career has a goalie's columns and headline", () => {
  const view = careerView(goalieCareer);

  expect(view?.columns.map((column) => column.label)).toEqual([
    "GP",
    "GS",
    "W",
    "L",
    "OTL",
    "GAA",
    "SV%",
    "SO",
  ]);
  expect(view?.headline).toEqual([
    { label: "GP", value: "169" },
    { label: "W", value: "75" },
    { label: "GAA", value: "2.65" },
    { label: "SV%", value: ".914" },
  ]);
});

test("a player yet to play has no career", () => {
  expect(careerView(emptyCareer)).toBeNull();
});

test("a skater's season comes from his career row, with shots from his game log", () => {
  const view = seasonView(profile({}), skaterCareer, skaterLog);

  expect(view?.season).toBe("2026-27");
  expect(view?.stats).toEqual([
    { label: "GP", value: "3", rank: null },
    { label: "G", value: "1", rank: "Tied-47th" },
    { label: "A", value: "0", rank: null },
    { label: "PTS", value: "1", rank: null },
    { label: "PIM", value: "2", rank: null },
    { label: "+/-", value: "-1", rank: null },
    // 6 + 1 + 3 shots in the three games of the log.
    { label: "SOG", value: "10", rank: null },
    { label: "PPG", value: "1", rank: null },
    { label: "PPA", value: "0", rank: null },
    { label: "GWG", value: "0", rank: null },
  ]);
});

test("a season split between clubs is shown as its total", () => {
  const lastSeason = profile({
    seasonSummary: { title: "2025-26 regular season stats", stats: [] },
  });

  const view = seasonView(lastSeason, skaterCareer, emptyLog);

  expect(view?.stats.slice(0, 2)).toEqual([
    { label: "GP", value: "60", rank: null },
    { label: "G", value: "15", rank: null },
  ]);
  // The game log is of another season, so there are no shots to count.
  expect(view?.stats.map((stat) => stat.label)).not.toContain("SOG");
});

test("a goalie's season is a goalie's line", () => {
  const goalie = profile({
    position: "G",
    seasonSummary: {
      title: "2026-27 regular season stats",
      stats: [
        { name: "wins-losses-overtimeLosses", label: "WINS-L-OTL", value: "1-0-0", rank: null },
        { name: "savePct", label: "SV%", value: ".963", rank: "5th" },
      ],
    },
  });

  expect(seasonView(goalie, goalieCareer, emptyLog)?.stats).toEqual([
    { label: "GP", value: "1", rank: null },
    { label: "GS", value: "1", rank: null },
    { label: "W", value: "1", rank: null },
    { label: "L", value: "0", rank: null },
    { label: "OTL", value: "0", rank: null },
    { label: "GAA", value: "1.03", rank: null },
    { label: "SV%", value: ".963", rank: "5th" },
    { label: "SO", value: "0", rank: null },
  ]);
});

test("without a career row for the season, ESPN's own summary is shown, relabelled", () => {
  const goalie = profile({
    position: "G",
    seasonSummary: {
      title: "2026-27 regular season stats",
      stats: [
        { name: "wins-losses-overtimeLosses", label: "WINS-L-OTL", value: "1-0-0", rank: null },
      ],
    },
  });

  expect(seasonView(goalie, emptyCareer, emptyLog)).toEqual({
    season: "2026-27",
    stats: [{ label: "W-L-OTL", value: "1-0-0", rank: null }],
  });
});

test("a player with no season summary has no season section", () => {
  expect(seasonView(profile({ seasonSummary: null }), skaterCareer, skaterLog)).toBeNull();
});

test("the game log shows the latest games, dated where the league keeps its calendar", () => {
  const view = gameLogView(skaterLog, 2);

  expect(view?.season).toBe("2026-27 Regular Season");
  expect(view?.gameCount).toBe(3);
  expect(view?.rows).toEqual([
    {
      gameId: "30",
      date: "Oct 3",
      opponent: "at OTT",
      result: "L 2-3",
      values: ["1", "6", "16.7", "21:50"],
    },
    {
      gameId: "20",
      date: "Sep 30",
      opponent: "vs OTT",
      result: "W 2-1",
      values: ["0", "1", "0.0", "20:04"],
    },
  ]);
  // "S" is shots on goal, and one game's ice time is not a per-game average.
  expect(view?.columns.map((column) => column.label)).toEqual(["G", "SOG", "S%", "TOI"]);
});

test("a player with no games has no game log", () => {
  expect(gameLogView(emptyLog, 10)).toBeNull();
});

test("the bio lists what ESPN has, and a goalie catches where a skater shoots", () => {
  expect(bioFacts(profile({}))).toEqual([
    { label: "born", value: "Sep 17, 1997 (29)" },
    { label: "birthplace", value: "San Ramon, CA" },
    { label: "height", value: `6' 3"` },
    { label: "weight", value: "214 lbs" },
    { label: "shoots", value: "Left" },
    { label: "drafted", value: "2016: Rd 1, Pk 1 (TOR)" },
    { label: "experience", value: "11th Season" },
  ]);
  expect(
    bioFacts(
      profile({
        position: "G",
        birthDate: null,
        age: null,
        birthPlace: null,
        weight: null,
        draft: null,
        experience: null,
      }),
    ),
  ).toEqual([
    { label: "height", value: `6' 3"` },
    { label: "catches", value: "Left" },
  ]);
});
