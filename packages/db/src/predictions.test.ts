import { env } from "cloudflare:workers";
import type { FailedPrediction, FinalGame } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import { createDb } from "./client.ts";
import { saveFinalGame } from "./games.ts";
import { getPrediction, getSeasonRecord, insertPredictionIfAbsent } from "./predictions.ts";
import { finalGame, madePrediction } from "./test-fixtures.ts";

const db = createDb(env.DB);

function failedPrediction(gameId: string): FailedPrediction {
  return {
    gameId,
    status: "failed",
    madeAt: "2026-04-15T14:02:40Z",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    inputs: { home: { record: "40-30-11" } },
  };
}

test("a Prediction that was inserted is read back whole", async () => {
  const prediction = madePrediction({ gameId: "pick-made" });

  expect(await insertPredictionIfAbsent(db, prediction)).toBe(true);

  expect(await getPrediction(db, "pick-made")).toEqual(prediction);
});

test("a game with no Prediction reads as null", async () => {
  expect(await getPrediction(db, "pick-none")).toBeNull();
});

test("a failed attempt is kept as a row with no pick", async () => {
  const failed = failedPrediction("pick-failed");

  expect(await insertPredictionIfAbsent(db, failed)).toBe(true);

  expect(await getPrediction(db, "pick-failed")).toEqual(failed);
});

test("a second Prediction for a game is refused and the first stands", async () => {
  const first = madePrediction({ gameId: "pick-once", pickTeamId: "9", winProbability: 58 });
  await insertPredictionIfAbsent(db, first);

  const second = madePrediction({ gameId: "pick-once", pickTeamId: "2", winProbability: 61 });
  expect(await insertPredictionIfAbsent(db, second)).toBe(false);
  expect(await insertPredictionIfAbsent(db, failedPrediction("pick-once"))).toBe(false);

  expect(await getPrediction(db, "pick-once")).toEqual(first);
});

test("a Prediction that does not fit the schema is refused, leaving the game free for a valid one", async () => {
  const invalid = madePrediction({ gameId: "pick-invalid", winProbability: 158 });
  await expect(insertPredictionIfAbsent(db, invalid)).rejects.toThrow();

  const valid = madePrediction({ gameId: "pick-invalid" });
  expect(await insertPredictionIfAbsent(db, valid)).toBe(true);
  expect(await getPrediction(db, "pick-invalid")).toEqual(valid);
});

test("two Predictions inserted at once for one game leave one row", async () => {
  const one = madePrediction({ gameId: "pick-race", pickTeamId: "9" });
  const other = madePrediction({ gameId: "pick-race", pickTeamId: "2" });

  const inserted = await Promise.all([
    insertPredictionIfAbsent(db, one),
    insertPredictionIfAbsent(db, other),
  ]);

  expect(inserted.filter(Boolean)).toHaveLength(1);
  const { results } = await env.DB.prepare("select pick_team_id from predictions where game_id = ?")
    .bind("pick-race")
    .all();
  expect(results).toHaveLength(1);
  expect(await getPrediction(db, "pick-race")).toEqual(inserted[0] ? one : other);
});

// Each record below is counted in a season of its own, so the tests cannot see each other's rows.
let nextSeason = 3000;

/** Writes one finished game of `season` and, when a pick is given, its Prediction. */
async function played(
  season: number,
  id: string,
  score: { home: number; away: number },
  pick?: "home" | "away" | "failed",
): Promise<FinalGame> {
  const base = finalGame();
  const game = finalGame({
    id,
    season,
    home: { ...base.home, score: score.home },
    away: { ...base.away, score: score.away },
  });
  await saveFinalGame(db, game);
  if (pick === "failed") await insertPredictionIfAbsent(db, failedPrediction(id));
  else if (pick)
    await insertPredictionIfAbsent(db, madePrediction({ gameId: id, pickTeamId: game[pick].id }));
  return game;
}

test("the season record counts picks right and wrong from the final scores", async () => {
  const season = nextSeason++;
  await played(season, "record-home-right", { home: 4, away: 1 }, "home");
  await played(season, "record-away-right", { home: 2, away: 5 }, "away");
  await played(season, "record-home-wrong", { home: 1, away: 2 }, "home");

  expect(await getSeasonRecord(db, season)).toEqual({ right: 2, wrong: 1 });
});

test("a game decided in overtime or a shootout counts like any other", async () => {
  const season = nextSeason++;
  // ESPN's final score for a shootout already gives the winner the extra goal.
  await played(season, "record-shootout-right", { home: 3, away: 4 }, "away");
  await played(season, "record-overtime-wrong", { home: 3, away: 2 }, "away");

  expect(await getSeasonRecord(db, season)).toEqual({ right: 1, wrong: 1 });
});

test("the season record skips failed Predictions and games that had none", async () => {
  const season = nextSeason++;
  await played(season, "record-counted", { home: 4, away: 1 }, "home");
  await played(season, "record-failed", { home: 4, away: 1 }, "failed");
  await played(season, "record-no-pick", { home: 4, away: 1 });

  expect(await getSeasonRecord(db, season)).toEqual({ right: 1, wrong: 0 });
});

test("the season record leaves out picks for games that are not final and for other seasons", async () => {
  const season = nextSeason++;
  await played(season, "record-this-season", { home: 4, away: 1 }, "away");
  await played(nextSeason++, "record-other-season", { home: 4, away: 1 }, "home");
  await insertPredictionIfAbsent(db, madePrediction({ gameId: "record-not-played-yet" }));

  expect(await getSeasonRecord(db, season)).toEqual({ right: 0, wrong: 1 });
});

test("a season with no picks has an empty record", async () => {
  expect(await getSeasonRecord(db, nextSeason++)).toEqual({ right: 0, wrong: 0 });
});
