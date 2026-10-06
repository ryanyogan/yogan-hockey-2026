import { z } from "zod";
import type { StoredPrediction } from "./stored-prediction.ts";

/** The lowest and highest chance a pick may claim. Under even is not a pick; 100 is not honest. */
const MIN_WIN_PROBABILITY = 50;
const MAX_WIN_PROBABILITY = 99;
const MAX_KEY_FACTORS = 3;
/** Generous bounds: they catch an essay or a list where a phrase was asked for, not a long name. */
const MAX_REASONING_LENGTH = 700;
const MAX_KEY_FACTOR_LENGTH = 160;

/** Words whose full stop does not end a sentence, in lower case. */
const ABBREVIATIONS = new Set(["st", "mr", "dr", "jr", "sr", "vs", "mt", "ft", "no"]);

/**
 * How many sentences a text has. A full stop ends one only when a space or the end of the text
 * follows it, so "3-1-0", ".926" and "2.10" end nothing, and not after an initial ("A. Stolarz")
 * or a common abbreviation ("St. Louis").
 */
export function countSentences(text: string): number {
  let count = 0;
  for (const match of text.trim().matchAll(/(\S+?)[.!?]+["')\]]*(?=\s|$)/g)) {
    const word = (match[1] ?? "").replace(/^["'([]+/, "");
    const stopped = match[0].includes(".") && !/[!?]/.test(match[0]);
    if (stopped && (/^[A-Z]$/.test(word) || ABBREVIATIONS.has(word.toLowerCase()))) continue;
    count += 1;
  }
  return count;
}

const ReasoningSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_REASONING_LENGTH)
  .refine((text) => [2, 3].includes(countSentences(text)), "Two or three sentences");

/**
 * What the model must answer for a game between two teams, given by abbreviation (spec section
 * 6): the team picked to win, that team's chance as a whole percentage, two or three sentences of
 * reasoning, and up to three key factors. An answer that fails this is not a Prediction.
 */
export function predictionOutputSchema(teams: readonly [string, string]) {
  return z.object({
    pick: z
      .string()
      .transform((text) => text.trim().toUpperCase())
      .pipe(z.enum(teams)),
    winProbability: z
      .number()
      .min(MIN_WIN_PROBABILITY)
      .max(MAX_WIN_PROBABILITY)
      .transform((value) => Math.round(value)),
    reasoning: ReasoningSchema,
    keyFactors: z.array(z.string().trim().min(1).max(MAX_KEY_FACTOR_LENGTH)).max(MAX_KEY_FACTORS),
  });
}
/** A model's answer that passed: a Prediction, but for the row's own fields. */
export type PredictionOutput = z.infer<ReturnType<typeof predictionOutputSchema>>;

/**
 * The same shape as JSON Schema, for a model's schema-constrained mode. Written out, not derived
 * from the Zod schema: that one is lenient about what it reads (case, a fractional percentage),
 * and the model is asked for the strict form.
 */
export function predictionOutputJsonSchema(teams: readonly [string, string]) {
  return {
    type: "object",
    properties: {
      pick: { type: "string", enum: [...teams] },
      winProbability: {
        type: "integer",
        minimum: MIN_WIN_PROBABILITY,
        maximum: MAX_WIN_PROBABILITY,
      },
      reasoning: { type: "string" },
      keyFactors: { type: "array", maxItems: MAX_KEY_FACTORS, items: { type: "string" } },
    },
    required: ["pick", "winProbability", "reasoning", "keyFactors"],
    additionalProperties: false,
  } as const;
}

/** The two sides of a finished game, as far as marking a pick needs them. */
type FinalScore = {
  home: { id: string; score: number };
  away: { id: string; score: number };
};

/**
 * Whether a game's pick was right, from its final score: the pick is for the winner, so a game
 * decided in overtime or a shootout counts like any other. Null when there is nothing to mark: a
 * failed or missing Prediction, or no final score yet. Hand it a final game only; a live game's
 * score would be marked too.
 */
export function pickOutcome(
  prediction: StoredPrediction | null,
  final: FinalScore | null,
): "right" | "wrong" | null {
  if (prediction?.status !== "made" || !final || final.home.score === final.away.score) return null;
  const winner = final.home.score > final.away.score ? final.home : final.away;
  return prediction.pickTeamId === winner.id ? "right" : "wrong";
}
