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

test("tonight's games run from what is on, to what is to come, to what is over", () => {
  expect(ids(tonightGames(SLATE, []))).toEqual(["live", "early", "late", "final", "off"]);
});

test("a favorite team's game comes first, whatever its state", () => {
  expect(ids(tonightGames(SLATE, ["VAN", "TB"]))).toEqual([
    "late",
    "final",
    "live",
    "early",
    "off",
  ]);
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
