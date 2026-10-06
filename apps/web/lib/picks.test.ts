import type { StoredPrediction } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import {
  finalResult,
  PICK_PENDING,
  pickLine,
  pickNote,
  recordLine,
  seasonOfSlate,
  slatePicks,
} from "./picks";

const NSH_AT_TOR = {
  id: "401892449",
  status: "scheduled",
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
  expect(pickLine(made("21", 58), NSH_AT_TOR)).toBe("TOR 58%");
  expect(pickLine(made("27", 61.4), NSH_AT_TOR)).toBe("NSH 61%");
});

test("a game still to come with no row says pick pending", () => {
  expect(pickLine(null, NSH_AT_TOR)).toBe("pick pending");
  expect(pickLine(undefined, NSH_AT_TOR)).toBe(PICK_PENDING);
});

test("a failed Prediction shows nothing, whatever the game's state", () => {
  expect(pickLine(failed(), NSH_AT_TOR)).toBeNull();
  expect(pickLine(failed(), { ...NSH_AT_TOR, status: "final" })).toBeNull();
});

test("a game that started without a pick is no longer pending", () => {
  expect(pickLine(null, { ...NSH_AT_TOR, status: "live" })).toBeNull();
  expect(pickLine(null, { ...NSH_AT_TOR, status: "final" })).toBeNull();
  expect(pickLine(null, { ...NSH_AT_TOR, status: "postponed" })).toBeNull();
});

test("a live or finished game keeps its pick as it was made", () => {
  expect(pickLine(made("21", 58), { ...NSH_AT_TOR, status: "live" })).toBe("TOR 58%");
  expect(pickLine(made("21", 58), { ...NSH_AT_TOR, status: "final" })).toBe("TOR 58%");
});

test("a pick for a team that is not in the game shows nothing", () => {
  expect(pickLine(made("99", 58), NSH_AT_TOR)).toBeNull();
});

test("a slate's picks are keyed by game, and a game with nothing to say has no entry", () => {
  const dalAtBuf = {
    id: "2",
    status: "scheduled",
    home: { id: "7", abbreviation: "BUF" },
    away: { id: "9", abbreviation: "DAL" },
  } as const;
  const failedGame = { ...dalAtBuf, id: "3" };
  const predictions = new Map([
    ["401892449", made("21", 58)],
    ["3", failed("3")],
  ]);
  expect(slatePicks([NSH_AT_TOR, dalAtBuf, failedGame], predictions)).toEqual({
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

test("the record line counts the picks that were right and wrong", () => {
  expect(recordLine({ right: 34, wrong: 21 })).toBe("picks: 34 right, 21 wrong");
  expect(recordLine({ right: 1, wrong: 0 })).toBe("picks: 1 right, 0 wrong");
});

test("there is no record line before any pick has been decided", () => {
  expect(recordLine({ right: 0, wrong: 0 })).toBeNull();
  expect(recordLine(null)).toBeNull();
});

test("a slate's season is ESPN's season year: the year the season ends in", () => {
  expect(seasonOfSlate("2026-10-06")).toBe(2027);
  expect(seasonOfSlate("2026-09-20")).toBe(2027);
  expect(seasonOfSlate("2027-01-02")).toBe(2027);
  expect(seasonOfSlate("2027-06-20")).toBe(2027);
  expect(seasonOfSlate("2027-07-01")).toBe(2028);
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
