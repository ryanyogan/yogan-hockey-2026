import { z } from "zod";

/** What every prediction row holds, whether or not the model produced a pick. */
const storedPredictionBase = {
  /** ESPN's event id. One row per game. */
  gameId: z.string().min(1),
  /** When the attempt finished, as a UTC instant. */
  madeAt: z.iso.datetime(),
  /** The model that made the pick, or the last one tried. */
  model: z.string().min(1),
  /** A compact copy of what the model was given. */
  inputs: z.record(z.string(), z.unknown()),
};

/** A Prediction as D1 keeps it. */
export const MadePredictionSchema = z.object({
  ...storedPredictionBase,
  status: z.literal("made"),
  /** ESPN's id for the team picked to win. */
  pickTeamId: z.string().min(1),
  /** The picked team's chance of winning, as a percentage. */
  winProbability: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  keyFactors: z.array(z.string().min(1)).max(3),
});
export type MadePrediction = z.infer<typeof MadePredictionSchema>;

/** The record that a game's Prediction was tried and failed, so it is never tried again. */
export const FailedPredictionSchema = z.object({
  ...storedPredictionBase,
  status: z.literal("failed"),
});
export type FailedPrediction = z.infer<typeof FailedPredictionSchema>;

/** A row of the predictions table: a Prediction, or the record of a failed attempt. */
export const StoredPredictionSchema = z.discriminatedUnion("status", [
  MadePredictionSchema,
  FailedPredictionSchema,
]);
export type StoredPrediction = z.infer<typeof StoredPredictionSchema>;

/** How the site's picks have done over a season. */
export const SeasonRecordSchema = z.object({
  right: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
});
export type SeasonRecord = z.infer<typeof SeasonRecordSchema>;
