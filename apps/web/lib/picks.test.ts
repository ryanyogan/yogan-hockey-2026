import type { StoredPrediction } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import {
  finalResult,
  madePicks,
  PICK_PENDING,
  pickLine,
  pickLineOutcome,
  pickNote,
  seasonNow,
  seasonOfSlate,
  slatePicks,
} from "./picks";

/** Seven hours before the puck drops. */
const NOON = new Date("2026-10-06T16:00:00Z");

const NSH_AT_TOR = {
  id: "401892449",
  status: "scheduled",
  startTime: "2026-10-06T23:00:00Z",
  home: { id: "21", abbreviation: "TOR" },
  away: { id: "27", abbreviation: "NSH" },
} as const;

function made(pickTeamId: string, winProbability: number, gameId = "401892449"): StoredPrediction {
  return {
    gameId,
    status: "made",
    pickTeamId,
    winProbability,
    reasoning: "Toronto is at home. Nashville played last night.",
    keyFactors: ["Home ice"],
    madeAt: "2026-10-06T16:00:00Z",
    model: "@cf/openai/gpt-oss-120b",
    inputs: {},
  };
}

function failed(gameId = "401892449"): StoredPrediction {
  return {
    gameId,
    status: "failed",
    madeAt: "2026-10-06T16:00:00Z",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    inputs: {},
  };
}

test("the one-line pick is the picked team's abbreviation and its win probability", () => {
  expect(pickLine(made("21", 58), NSH_AT_TOR, NOON)).toBe("TOR 58%");
  expect(pickLine(made("27", 61.4), NSH_AT_TOR, NOON)).toBe("NSH 61%");
});

test("a game still to come with no row says pick pending", () => {
  expect(pickLine(null, NSH_AT_TOR, NOON)).toBe("pick pending");
  expect(pickLine(undefined, NSH_AT_TOR, NOON)).toBe(PICK_PENDING);
});

test("a failed Prediction shows nothing, whatever the game's state", () => {
  expect(pickLine(failed(), NSH_AT_TOR, NOON)).toBeNull();
  expect(pickLine(failed(), { ...NSH_AT_TOR, status: "final" }, NOON)).toBeNull();
});

test("a game that started without a pick is no longer pending", () => {
  expect(pickLine(null, { ...NSH_AT_TOR, status: "live" }, NOON)).toBeNull();
  expect(pickLine(null, { ...NSH_AT_TOR, status: "final" }, NOON)).toBeNull();
  expect(pickLine(null, { ...NSH_AT_TOR, status: "postponed" }, NOON)).toBeNull();
});

test("a live or finished game keeps its pick as it was made", () => {
  expect(pickLine(made("21", 58), { ...NSH_AT_TOR, status: "live" }, NOON)).toBe("TOR 58%");
  expect(pickLine(made("21", 58), { ...NSH_AT_TOR, status: "final" }, NOON)).toBe("TOR 58%");
});

test("a pick for a team that is not in the game shows nothing", () => {
  expect(pickLine(made("99", 58), NSH_AT_TOR, NOON)).toBeNull();
});

test("a slate's picks are keyed by game, and a game with nothing to say has no entry", () => {
  const dalAtBuf = {
    id: "2",
    status: "scheduled",
    startTime: "2026-10-06T23:00:00Z",
    home: { id: "7", abbreviation: "BUF" },
    away: { id: "9", abbreviation: "DAL" },
  } as const;
  const failedGame = { ...dalAtBuf, id: "3" };
  const predictions = new Map([
    ["401892449", made("21", 58)],
    ["3", failed("3")],
  ]);
  expect(slatePicks([NSH_AT_TOR, dalAtBuf, failedGame], predictions, NOON)).toEqual({
    "401892449": "TOR 58%",
    "2": "pick pending",
  });
});

test("a pending pick drawn before the game started is dropped once it has", () => {
  expect(pickNote("pick pending", "scheduled")).toBe("pick pending");
  expect(pickNote("pick pending", "live")).toBeUndefined();
  expect(pickNote("pick pending", "final")).toBeUndefined();
  expect(pickNote("TOR 58%", "live")).toBe("TOR 58%");
  expect(pickNote(undefined, "scheduled")).toBeUndefined();
});

test("a slate's season is ESPN's season year: the year the season ends in", () => {
  expect(seasonOfSlate("2026-10-06")).toBe(2027);
  expect(seasonOfSlate("2026-09-20")).toBe(2027);
  expect(seasonOfSlate("2027-01-02")).toBe(2027);
  expect(seasonOfSlate("2027-06-20")).toBe(2027);
  expect(seasonOfSlate("2027-07-01")).toBe(2028);
});

test("the season now is the slate's, and the NHL's own day's when no slate is known", () => {
  // Half past midnight UTC on July 1 is still June 30 where the NHL keeps its days.
  const lateJune = new Date("2027-07-01T00:30:00Z");
  expect(seasonNow("2026-10-06", lateJune)).toBe(2027);
  expect(seasonNow(null, lateJune)).toBe(2027);
  expect(seasonNow(null, new Date("2027-07-01T12:00:00Z"))).toBe(2028);
});

test("a finished game's result names the winner, home or away, with the final score", () => {
  const final = {
    id: "401803652",
    startTime: "2026-04-15T23:00:00Z",
    season: 2026,
    seasonType: 2,
    home: { id: "2", abbreviation: "BUF", name: "Buffalo Sabres", score: 3 },
    away: { id: "9", abbreviation: "DAL", name: "Dallas Stars", score: 4 },
  };
  expect(finalResult(final)).toBe("Dallas Stars won 4-3");
  expect(finalResult({ ...final, home: { ...final.home, score: 5 } })).toBe(
    "Buffalo Sabres won 5-4",
  );
});

test("a game whose start has passed without a row is not pending, whatever its status says", () => {
  const late = new Date("2026-10-06T23:05:00Z");
  expect(pickLine(null, NSH_AT_TOR, late)).toBeNull();
  expect(pickLine(made("21", 58), NSH_AT_TOR, late)).toBe("TOR 58%");
});

test("a slate's picks for the browser are the made ones, and only what saying and marking them takes", () => {
  const predictions = new Map([
    ["401892449", made("21", 58)],
    ["401892450", failed("401892450")],
  ]);
  expect(madePicks(predictions)).toEqual({
    "401892449": { status: "made", pickTeamId: "21", winProbability: 58 },
  });
});

test("a one-line pick is right or wrong once its game is final, and unmarked until then", () => {
  const game = (status: "scheduled" | "live" | "final", home: number, away: number) => ({
    status,
    home: { id: "23", abbreviation: "WSH", score: home },
    away: { id: "124292", abbreviation: "SEA", score: away },
  });
  expect(pickLineOutcome("WSH 63%", game("final", 3, 5))).toBe("wrong");
  expect(pickLineOutcome("SEA 55%", game("final", 3, 5))).toBe("right");
  expect(pickLineOutcome("WSH 63%", game("final", 4, 3))).toBe("right");
  // Not before the final, whatever the score says.
  expect(pickLineOutcome("WSH 63%", game("live", 4, 3))).toBeNull();
  expect(pickLineOutcome("WSH 63%", game("scheduled", 0, 0))).toBeNull();
  // Nothing to mark: no line, a pick still pending, a club not in the game, no winner.
  expect(pickLineOutcome(undefined, game("final", 4, 3))).toBeNull();
  expect(pickLineOutcome("pick pending", game("final", 4, 3))).toBeNull();
  expect(pickLineOutcome("TOR 58%", game("final", 4, 3))).toBeNull();
  expect(pickLineOutcome("WSH 63%", game("final", 3, 3))).toBeNull();
  // An abbreviation that begins another's is not it.
  expect(pickLineOutcome("WSHX 63%", game("final", 4, 3))).toBeNull();
});
