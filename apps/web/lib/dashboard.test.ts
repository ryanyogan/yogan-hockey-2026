import { getStandings } from "@yogan-hockey/espn";
import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { beforeAll, expect, test, vi } from "vitest";
import { gamePlayingNow, tonightGames, tonightSummary, topOfConferences } from "./dashboard";

beforeAll(() => {
  vi.stubEnv("ESPN_FIXTURES", "1");
});

function side(id: string): ScoreboardGame["home"] {
  return {
    id,
    abbreviation: id,
    logo: null,
    logoDark: null,
    score: 0,
    winner: false,
    record: null,
  };
}

function game(
  id: string,
  status: ScoreboardGame["status"],
  [away, home]: [string, string],
  startTime = "2026-10-06T23:00:00Z",
): ScoreboardGame {
  return {
    id,
    startTime,
    seasonType: 2,
    status,
    period: 0,
    clock: "0:00",
    detail: "",
    venue: null,
    away: side(away),
    home: side(home),
  };
}

const SLATE = [
  game("final", "final", ["FLA", "TB"], "2026-10-06T21:00:00Z"),
  game("late", "scheduled", ["EDM", "VAN"], "2026-10-07T02:00:00Z"),
  game("early", "scheduled", ["BOS", "NYR"], "2026-10-06T23:30:00Z"),
  game("live", "live", ["TOR", "MTL"]),
  game("off", "postponed", ["CAR", "CBJ"]),
];

const ids = (games: ScoreboardGame[]) => games.map((each) => each.id);

test("tonight's games stay in scheduled start order regardless of their state", () => {
  expect(ids(tonightGames(SLATE))).toEqual(["final", "live", "off", "early", "late"]);
});

test("live updates replace game details without moving a row", () => {
  const before = [
    game("1", "scheduled", ["TOR", "MTL"]),
    game("2", "scheduled", ["EDM", "VAN"], "2026-10-07T02:00:00Z"),
  ];
  for (const status of ["live", "final", "postponed"] as const) {
    const updated = before.map((each) => ({
      ...each,
      status: each.id === "2" ? status : each.status,
      period: 2,
      clock: "12:34",
      home: { ...each.home, score: 3 },
    }));
    const sorted = tonightGames(updated);
    expect(ids(sorted)).toEqual(ids(tonightGames(before)));
    expect(sorted[1]).toBe(updated[1]);
    expect(sorted[1]).toMatchObject({ status, period: 2, clock: "12:34", home: { score: 3 } });
  }
});

test("equal-start games use their ids even when the feed arrives in another order", () => {
  const tied = [
    game("401892450", "scheduled", ["BOS", "NYR"]),
    game("401892449", "scheduled", ["NSH", "TOR"]),
    game("401892448", "scheduled", ["CAR", "MTL"]),
  ];
  expect(ids(tonightGames(tied))).toEqual(["401892448", "401892449", "401892450"]);
  expect(ids(tonightGames(tied.toReversed()))).toEqual(ids(tonightGames(tied)));
});

test("sorting leaves the shared scoreboard array and its games untouched", () => {
  const source = Object.freeze(SLATE.map((each) => Object.freeze({ ...each })));
  const original = structuredClone(source);
  const sorted = tonightGames(source);
  expect(source).toEqual(original);
  expect(sorted).not.toBe(source);
  expect(sorted.every((each) => source.includes(each))).toBe(true);
});

test("the header counts the games and those in progress", () => {
  expect(tonightSummary(SLATE)).toBe("5 games, 1 live");
  expect(tonightSummary(SLATE.slice(0, 3))).toBe("3 games");
  expect(tonightSummary(SLATE.slice(0, 1))).toBe("1 game");
  expect(tonightSummary([])).toBeNull();
});

test("a player is playing now when his team is in a game in progress", () => {
  expect(gamePlayingNow("TOR", SLATE)?.id).toBe("live");
  expect(gamePlayingNow("MTL", SLATE)?.id).toBe("live");
  // To come, over, and called off are not now.
  expect(gamePlayingNow("EDM", SLATE)).toBeUndefined();
  expect(gamePlayingNow("FLA", SLATE)).toBeUndefined();
  expect(gamePlayingNow("CAR", SLATE)).toBeUndefined();
  // A free agent has no team.
  expect(gamePlayingNow(undefined, SLATE)).toBeUndefined();
});

test("the dashboard's standings are each conference's top eight by points", async () => {
  const tables = topOfConferences(await getStandings());

  expect(tables.map((table) => table.title)).toEqual(["Eastern Conference", "Western Conference"]);
  for (const table of tables) {
    expect(table.rows).toHaveLength(8);
    const points = table.rows.map((row) => row.points);
    expect(points).toEqual(points.toSorted((a, b) => b - a));
    expect(new Set(table.rows.map((row) => row.conference.name))).toEqual(new Set([table.title]));
  }
});
