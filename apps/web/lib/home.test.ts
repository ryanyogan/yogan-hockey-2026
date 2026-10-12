import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import { lineScore } from "./home";

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
): ScoreboardGame {
  return {
    id,
    startTime: "2026-10-06T23:00:00Z",
    seasonType: 2,
    status,
    period: 3,
    clock: "0:00",
    detail: "",
    venue: null,
    away: side(away),
    home: side(home),
  };
}

test("a line score names the game, heads its score by the game's state and marks a final's winner", () => {
  const final = game("1", "final", ["SEA", "WSH"]);
  final.away = {
    ...final.away,
    location: "Seattle",
    shortName: "Kraken",
    score: 5,
    record: "4-2-0",
  };
  final.home = { ...final.home, location: "Washington", shortName: "Capitals", score: 3 };
  expect(lineScore(final)).toEqual({
    caption: "Kraken 5, Capitals 3: line score",
    score: "F",
    sides: [
      { id: "SEA", name: "Seattle", record: "4-2-0", score: 5, winner: true },
      { id: "WSH", name: "Washington", record: null, score: 3, winner: false },
    ],
  });

  const live = { ...final, status: "live" as const, period: 3, clock: "9:02" };
  expect(lineScore(live).score).toBe("Now");
  // A live game has nobody ahead for good.
  expect(lineScore(live).sides.map((each) => each.winner)).toEqual([false, false]);

  for (const status of ["scheduled", "postponed"] as const) {
    const toCome = lineScore({ ...final, status });
    expect(toCome.score).toBeNull();
    expect(toCome.sides.map((each) => each.score)).toEqual([null, null]);
  }
  // Live from the warm-up, which reads as a game to come: no score to show yet.
  expect(lineScore({ ...live, period: 0 }).score).toBeNull();
});
