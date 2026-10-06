import { env } from "cloudflare:workers";
import { createDb, insertPredictionIfAbsent, saveFinalGame } from "@yogan-hockey/db";
import type { FinalGame, StoredPrediction } from "@yogan-hockey/schemas";
import { seasonOfSlate } from "./picks";
import { readScoreboard } from "./scoreboard";

/*
 * Scaffolding for #53: picks to look at in fixture mode, where the AI binding has nothing behind
 * it and every game of the slate ends with a `failed` row. Used by `/skeleton/picks`, which the
 * Playwright setup and the screenshot script press.
 */

/** Nashville at Toronto, the recorded scheduled game: the pick every test and shot reads. */
const NSH_AT_TOR = { gameId: "401892449", pickTeamId: "21", winProbability: 58 };
/** The game of the recorded slate whose Prediction is seeded as failed. */
export const SAMPLE_FAILED_GAME = "401892450";
/** Dallas 4 at Buffalo 3 in a shootout, the recorded final (season 2026). */
const FINAL_GAME = { gameId: "401803652", winnerId: "9", loserId: "2" };
/** Finished games that exist only here, in the slate's season: they make the season record. */
const DECIDED = ["right", "right", "right", "wrong", "wrong"] as const;
export const SAMPLE_RECORD = "picks: 3 right, 2 wrong";

const MODEL = "@cf/openai/gpt-oss-120b";

function made(
  gameId: string,
  pickTeamId: string,
  winProbability: number,
  madeAt: string,
): StoredPrediction {
  return {
    gameId,
    status: "made",
    pickTeamId,
    winProbability,
    reasoning:
      "They have the better record and the healthier lineup. Their starter has a .926 save percentage over his last five, and the other side played last night.",
    keyFactors: ["A rested, healthy lineup", "Goaltending form", "Opponent on a back-to-back"],
    madeAt,
    model: MODEL,
    inputs: { sample: true },
  };
}

/**
 * Replaces the sample rows: a pick for every game of today's slate but one, which is a failed
 * attempt; a pick for the recorded final, right or wrong as asked; and five decided games in the
 * slate's season. A row the Scoreboard wrote first (a `failed` one, locally) is replaced, which
 * nothing else on the site ever does to a prediction.
 */
export async function seedSamplePicks(finalPick: "right" | "wrong"): Promise<void> {
  const { date, games } = await readScoreboard();
  if (date == null) throw new Error("The Scoreboard has no slate to seed picks for");
  const madeAt = `${date}T16:02:00Z`;

  const rows: StoredPrediction[] = games.map((game, index) => {
    if (game.id === SAMPLE_FAILED_GAME) {
      return { gameId: game.id, status: "failed", madeAt, model: MODEL, inputs: { sample: true } };
    }
    return game.id === NSH_AT_TOR.gameId
      ? made(game.id, NSH_AT_TOR.pickTeamId, NSH_AT_TOR.winProbability, madeAt)
      : made(game.id, game.home.id, 52 + ((index * 3) % 14), madeAt);
  });
  rows.push(
    made(
      FINAL_GAME.gameId,
      finalPick === "right" ? FINAL_GAME.winnerId : FINAL_GAME.loserId,
      55,
      "2026-04-15T16:02:00Z",
    ),
  );

  const decided: FinalGame[] = DECIDED.map((_, index) => ({
    id: `sample-pick-${index}`,
    startTime: `${date}T00:00:00Z`,
    season: seasonOfSlate(date),
    seasonType: 2,
    home: { id: "21", abbreviation: "TOR", name: "Toronto Maple Leafs", score: 3 },
    away: { id: "27", abbreviation: "NSH", name: "Nashville Predators", score: 2 },
  }));
  decided.forEach((game, index) => {
    const pick = DECIDED[index] === "right" ? game.home.id : game.away.id;
    rows.push(made(game.id, pick, 60, madeAt));
  });

  const db = createDb(env.DB);
  for (const game of decided) await saveFinalGame(db, game);
  const forget = env.DB.prepare("DELETE FROM predictions WHERE game_id = ?");
  await env.DB.batch(rows.map((row) => forget.bind(row.gameId)));
  for (const row of rows) await insertPredictionIfAbsent(db, row);
}
