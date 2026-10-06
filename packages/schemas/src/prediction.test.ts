import { describe, expect, test } from "vitest";
import { pickOutcome, predictionOutputJsonSchema, predictionOutputSchema } from "./prediction.ts";
import type { StoredPrediction } from "./stored-prediction.ts";

const schema = predictionOutputSchema(["NSH", "TOR"]);

const answer = {
  pick: "TOR",
  winProbability: 58,
  reasoning:
    "Toronto is at home and has won four of its last five. Nashville is missing its top centre.",
  keyFactors: ["Home ice", "Four wins in five", "Nashville's top centre is out"],
};

describe("the model's answer", () => {
  test("a pick for one of the two teams, with its probability, reasoning and key factors, passes", () => {
    expect(schema.parse(answer)).toEqual(answer);
  });

  test("a pick for a team that is not playing fails", () => {
    expect(schema.safeParse({ ...answer, pick: "MTL" }).success).toBe(false);
  });

  test("the abbreviation is read whatever its case and spacing", () => {
    expect(schema.parse({ ...answer, pick: " tor " }).pick).toBe("TOR");
  });

  test.each([
    ["under even", 49],
    ["a certainty", 100],
    ["a fraction of 1 in place of a percentage", 0.58],
  ])("a probability that is %s fails", (_name, winProbability) => {
    expect(schema.safeParse({ ...answer, winProbability }).success).toBe(false);
  });

  test("a probability is kept as a whole percentage", () => {
    expect(schema.parse({ ...answer, winProbability: 57.6 }).winProbability).toBe(58);
  });

  test("a probability sent as text fails", () => {
    expect(schema.safeParse({ ...answer, winProbability: "58%" }).success).toBe(false);
  });

  test.each([
    ["one sentence", "Toronto is at home and has been the better team so far."],
    [
      "four sentences",
      "Toronto is at home. Toronto has won four of five. Nashville is hurt. It should be close.",
    ],
    ["nothing", ""],
  ])("reasoning of %s fails", (_name, reasoning) => {
    expect(schema.safeParse({ ...answer, reasoning }).success).toBe(false);
  });

  test("a record, a decimal and a goalie's initial are not taken for the end of a sentence", () => {
    const reasoning =
      "Toronto is 3-1-0 at home and A. Stolarz has a .926 save percentage and a 2.10 average. St. Louis has lost four straight on the road!";
    expect(schema.safeParse({ ...answer, reasoning }).success).toBe(true);
  });

  test("more than three key factors fail, and none at all pass", () => {
    const four = ["one", "two", "three", "four"];
    expect(schema.safeParse({ ...answer, keyFactors: four }).success).toBe(false);
    expect(schema.safeParse({ ...answer, keyFactors: [] }).success).toBe(true);
  });

  test("an answer with a field missing fails", () => {
    const { reasoning: _reasoning, ...rest } = answer;
    expect(schema.safeParse(rest).success).toBe(false);
  });
});

describe("the JSON Schema the model is held to", () => {
  test("names the two teams as the only picks and requires every field", () => {
    const json = predictionOutputJsonSchema(["NSH", "TOR"]);
    expect(json).toMatchObject({
      type: "object",
      properties: {
        pick: { type: "string", enum: ["NSH", "TOR"] },
        winProbability: { type: "integer", minimum: 50, maximum: 99 },
        reasoning: { type: "string" },
        keyFactors: { type: "array", maxItems: 3, items: { type: "string" } },
      },
      required: ["pick", "winProbability", "reasoning", "keyFactors"],
      additionalProperties: false,
    });
  });
});

describe("whether a pick was right", () => {
  const made: StoredPrediction = {
    gameId: "1",
    status: "made",
    pickTeamId: "21",
    winProbability: 58,
    reasoning: "r",
    keyFactors: [],
    madeAt: "2026-10-06T20:00:00.000Z",
    model: "m",
    inputs: {},
  };
  const final = (homeScore: number, awayScore: number) => ({
    home: { id: "21", score: homeScore },
    away: { id: "27", score: awayScore },
  });

  test("right when the picked team won, by any margin and however late", () => {
    expect(pickOutcome(made, final(4, 3))).toBe("right");
  });

  test("wrong when the other team won", () => {
    expect(pickOutcome(made, final(1, 2))).toBe("wrong");
  });

  test("neither for a failed Prediction, a missing one, or a game with no final score", () => {
    const failed: StoredPrediction = {
      gameId: "1",
      status: "failed",
      madeAt: made.madeAt,
      model: "m",
      inputs: {},
    };
    expect(pickOutcome(failed, final(4, 3))).toBeNull();
    expect(pickOutcome(null, final(4, 3))).toBeNull();
    expect(pickOutcome(made, null)).toBeNull();
  });
});
