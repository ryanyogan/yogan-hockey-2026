import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { createDb, insertPredictionIfAbsent, saveFinalGame } from "@yogan-hockey/db";
import type { FinalGame, StoredPrediction } from "@yogan-hockey/schemas";
import { beforeAll, expect, test } from "vitest";
import { readGamePick } from "./game-pick";

const db = createDb(env.DB);

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

// The tests of this file share one database, so each has game ids of its own.
function made(gameId: string, pickTeamId: string): StoredPrediction {
  return {
    gameId,
    status: "made",
    pickTeamId,
    winProbability: 58,
    reasoning: "Toronto is at home. Nashville played last night.",
    keyFactors: ["Home ice"],
    madeAt: "2026-10-06T16:00:00Z",
    model: "@cf/openai/gpt-oss-120b",
    inputs: {},
  };
}

function final(id: string): FinalGame {
  return {
    id,
    startTime: "2026-10-06T23:00:00Z",
    season: 2027,
    seasonType: 2,
    home: { id: "21", abbreviation: "TOR", name: "Toronto Maple Leafs", score: 2 },
    away: { id: "27", abbreviation: "NSH", name: "Nashville Predators", score: 3 },
  };
}

test("a game still to come with no row is pending", async () => {
  expect(await readGamePick({ id: "pick-none-yet", status: "scheduled" })).toEqual({
    state: "pending",
  });
});

test("a game that started, ended or was called off without a row has no pick", async () => {
  for (const status of ["live", "final", "postponed"] as const) {
    expect(await readGamePick({ id: "pick-never-made", status })).toEqual({ state: "none" });
  }
});

test("a failed Prediction is no pick, before the game and after", async () => {
  await insertPredictionIfAbsent(db, {
    gameId: "pick-failed",
    status: "failed",
    madeAt: "2026-10-06T16:00:00Z",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    inputs: {},
  });

  expect(await readGamePick({ id: "pick-failed", status: "scheduled" })).toEqual({ state: "none" });
  expect(await readGamePick({ id: "pick-failed", status: "final" })).toEqual({ state: "none" });
});

test("a pick comes with no final score until the game is over and written", async () => {
  const prediction = made("pick-live", "21");
  await insertPredictionIfAbsent(db, prediction);
  // A row for the game, as if it were written early: a live game still reads no final score.
  await saveFinalGame(db, final("pick-live"));

  expect(await readGamePick({ id: "pick-live", status: "scheduled" })).toEqual({
    state: "made",
    prediction,
    final: null,
  });
  expect(await readGamePick({ id: "pick-live", status: "live" })).toEqual({
    state: "made",
    prediction,
    final: null,
  });
  expect(await readGamePick({ id: "pick-unwritten", status: "final" })).toEqual({ state: "none" });
});

test("a finished game's pick comes with the final score D1 holds", async () => {
  const prediction = made("pick-final", "21");
  await insertPredictionIfAbsent(db, prediction);
  expect(await readGamePick({ id: "pick-final", status: "final" })).toEqual({
    state: "made",
    prediction,
    final: null,
  });

  await saveFinalGame(db, final("pick-final"));

  expect(await readGamePick({ id: "pick-final", status: "final" })).toEqual({
    state: "made",
    prediction,
    final: final("pick-final"),
  });
});
