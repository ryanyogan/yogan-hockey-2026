import {
  type SeasonRecord,
  type StoredPrediction,
  StoredPredictionSchema,
} from "@yogan-hockey/schemas";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "./client.ts";
import { games, predictions } from "./schema.ts";

type PredictionRow = typeof predictions.$inferSelect;

/**
 * Inserts a game's prediction row, a Prediction or the record of a failed attempt, unless the
 * game already has one. Returns whether this call's row is the one kept. The table's key decides,
 * so of two calls racing for one game exactly one returns true.
 */
export async function insertPredictionIfAbsent(
  db: Db,
  prediction: StoredPrediction,
): Promise<boolean> {
  const inserted = await db
    .insert(predictions)
    .values(toPredictionRow(prediction))
    .onConflictDoNothing({ target: predictions.gameId })
    .returning({ gameId: predictions.gameId });
  return inserted.length === 1;
}

/** A game's prediction row: a Prediction, a failed attempt, or null when there is neither. */
export async function getPrediction(db: Db, gameId: string): Promise<StoredPrediction | null> {
  const [row] = await db.select().from(predictions).where(eq(predictions.gameId, gameId));
  return row ? toStoredPrediction(row) : null;
}

/**
 * How the picks did over one ESPN season year, from the final scores in D1. The pick is for the
 * winner, so a game decided in overtime or a shootout counts like any other. A failed row, and a
 * pick whose game is not final yet, count as neither.
 */
export async function getSeasonRecord(db: Db, season: number): Promise<SeasonRecord> {
  const winnerId = sql`case
    when ${games.homeScore} > ${games.awayScore} then ${games.homeTeamId}
    when ${games.awayScore} > ${games.homeScore} then ${games.awayTeamId}
  end`;
  const [record] = await db
    .select({
      right: sql<number>`coalesce(sum(${predictions.pickTeamId} = ${winnerId}), 0)`,
      wrong: sql<number>`coalesce(sum(${predictions.pickTeamId} <> ${winnerId}), 0)`,
    })
    .from(predictions)
    .innerJoin(games, eq(games.id, predictions.gameId))
    .where(and(eq(predictions.status, "made"), eq(games.season, season)));
  return record ?? { right: 0, wrong: 0 };
}

function toPredictionRow(prediction: StoredPrediction): PredictionRow {
  const made = prediction.status === "made" ? prediction : null;
  return {
    gameId: prediction.gameId,
    status: prediction.status,
    pickTeamId: made?.pickTeamId ?? null,
    winProbability: made?.winProbability ?? null,
    reasoning: made?.reasoning ?? null,
    keyFactors: made?.keyFactors ?? null,
    madeAt: prediction.madeAt,
    model: prediction.model,
    inputs: prediction.inputs,
  };
}

/** Parsed, not cast: the schema is what says a made row has its pick and a failed row has none. */
function toStoredPrediction(row: PredictionRow): StoredPrediction {
  const { pickTeamId, winProbability, reasoning, keyFactors, ...always } = row;
  return StoredPredictionSchema.parse(
    row.status === "made"
      ? { ...always, pickTeamId, winProbability, reasoning, keyFactors }
      : always,
  );
}
