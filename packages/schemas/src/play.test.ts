import { describe, expect, test } from "vitest";
import { isKeyPlay, type Play } from "./play.ts";

function play(overrides: Partial<Play>): Play {
  return {
    id: "1",
    type: "faceoff",
    typeText: "Face Off",
    period: 1,
    periodText: "1st",
    clock: "0:00",
    text: "",
    teamId: null,
    coordinate: null,
    scoring: false,
    penalty: false,
    homeScore: 0,
    awayScore: 0,
    strength: null,
    wallclock: null,
    participants: [],
    ...overrides,
  };
}

describe("a key play", () => {
  test.each([
    ["a goal", { type: "goal", scoring: true }],
    ["a shot on goal", { type: "shot-on-goal" }],
    ["the start of a period", { type: "period-start" }],
    ["the end of a period", { type: "period-end" }],
    ["a penalty, whatever the infraction is called", { type: "High-sticking", penalty: true }],
  ])("is %s", (_name, overrides) => {
    expect(isKeyPlay(play(overrides))).toBe(true);
  });

  test.each([
    ["a faceoff", "faceoff"],
    ["a hit", "hit"],
    ["a missed shot", "shot-missed"],
    ["a blocked shot", "shot-blocked"],
    ["a giveaway", "giveaway"],
    ["a takeaway", "takeaway"],
    ["a stoppage", "stoppage"],
    ["the end of the shootout", "shootout-end"],
    ["the end of the game", "end-of-game"],
  ])("is not %s", (_name, type) => {
    expect(isKeyPlay(play({ type }))).toBe(false);
  });
});
