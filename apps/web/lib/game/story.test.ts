import { describe, expect, test } from "vitest";
import { easternKicker, gameLineScore, type StoryGame } from "./story";

type Side = StoryGame["home"];

const side = (abbreviation: string, over: Partial<Side> = {}): Side => ({
  id: `id-${abbreviation}`,
  abbreviation,
  logo: null,
  logoDark: null,
  score: 0,
  winner: false,
  record: "1-0-0",
  ...over,
});

const game = (over: Partial<StoryGame> = {}): StoryGame => ({
  id: "1",
  startTime: "2026-10-06T23:00:00Z",
  seasonType: 2,
  status: "scheduled",
  period: 0,
  clock: "0:00",
  detail: "Scheduled",
  venue: "Climate Pledge Arena",
  away: side("VGK", { location: "Vegas", shortName: "Golden Knights", record: "2-1-0" }),
  home: side("SEA", { location: "Seattle", shortName: "Kraken", record: null }),
  ...over,
});

describe("gameLineScore", () => {
  test("a game to come is its teams and their records, the visitors first, with no score", () => {
    const line = gameLineScore(game());
    expect(line.caption).toBe("Golden Knights at Kraken: line score");
    expect(line.score).toBeNull();
    expect(line.sides.map((s) => [s.name, s.record, s.shots, s.score, s.winner])).toEqual([
      ["Vegas", "2⁠-⁠1⁠-⁠0", null, null, false],
      ["Seattle", null, null, null, false],
    ]);
  });

  test("a final is headed F and its winner is marked", () => {
    const line = gameLineScore(
      game({
        status: "final",
        period: 3,
        away: side("SEA", { location: "Seattle", shortName: "Kraken", score: 5, shots: 31 }),
        home: side("WSH", { location: "Washington", shortName: "Capitals", score: 3, shots: 28 }),
      }),
    );
    expect(line.caption).toBe("Kraken 5, Capitals 3: line score");
    expect(line.score).toBe("F");
    expect(line.sides.map((s) => [s.name, s.shots, s.score, s.winner])).toEqual([
      ["Seattle", 31, 5, true],
      ["Washington", 28, 3, false],
    ]);
  });

  test("a game under way is headed Now and marks nobody, whoever leads", () => {
    const line = gameLineScore(
      game({
        status: "live",
        period: 3,
        away: side("NYI", { location: "New York", shortName: "Islanders", score: 1, shots: 20 }),
        home: side("NYR", { location: "New York", shortName: "Rangers", score: 2 }),
      }),
    );
    expect(line.score).toBe("Now");
    expect(line.sides.map((s) => [s.name, s.shots, s.score, s.winner])).toEqual([
      ["N.Y. Islanders", 20, 1, false],
      ["N.Y. Rangers", null, 2, false],
    ]);
  });

  test("a game called live before the puck drops, and one called off, have no score", () => {
    expect(gameLineScore(game({ status: "live", period: 0 })).score).toBeNull();
    expect(gameLineScore(game({ status: "postponed" })).score).toBeNull();
  });
});

describe("easternKicker", () => {
  test("a start time is the NHL's and says so", () => {
    expect(easternKicker(game())).toBe("7:00 PM ET · Climate Pledge Arena");
    expect(easternKicker(game({ venue: null }))).toBe("7:00 PM ET");
  });

  test("a status with no time in it is left as it is", () => {
    expect(easternKicker(game({ status: "final", period: 3 }))).toBe(
      "Final · Climate Pledge Arena",
    );
    expect(easternKicker(game({ status: "live", period: 3, clock: "18:44" }))).toBe(
      "Live · 3rd 18:44 · Climate Pledge Arena",
    );
  });
});
