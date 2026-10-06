import type { PregameGoalie, PregameStanding, RecentGame } from "@yogan-hockey/schemas";
import { describe, expect, it } from "vitest";
import { goalieRecord, lastFiveLine, savePct, standingLine } from "./matchup";

const standing = (over: Partial<PregameStanding>): PregameStanding => ({
  position: 1,
  division: "Atlantic Division",
  wins: 0,
  losses: 0,
  otLosses: 0,
  points: 0,
  ...over,
});

describe("standingLine", () => {
  it("places a team in its division, without the word every division shares", () => {
    expect(standingLine(standing({ position: 3 }))).toBe("3rd Atlantic");
    expect(standingLine(standing({ position: 1, division: "Central Division" }))).toBe(
      "1st Central",
    );
    expect(standingLine(standing({ position: 2 }))).toBe("2nd Atlantic");
    expect(standingLine(standing({ position: 8 }))).toBe("8th Atlantic");
  });

  it("is a dash before ESPN has a standing", () => {
    expect(standingLine(null)).toBe("-");
  });
});

describe("lastFiveLine", () => {
  const game = (result: string): RecentGame => ({
    gameId: "1",
    startTime: "2026-10-01T23:00:00Z",
    home: true,
    opponent: { id: "2", abbreviation: "BUF", name: "Buffalo Sabres" },
    result,
    goalsFor: 3,
    goalsAgainst: 2,
  });

  it("reads oldest to newest, as ESPN lists them", () => {
    expect(lastFiveLine(["W", "L", "L", "W", "W"].map(game))).toBe("W L L W W");
  });

  it("is a dash when ESPN has dropped them, as it does once a game starts", () => {
    expect(lastFiveLine([])).toBe("-");
  });
});

describe("a goalie's figures", () => {
  const goalie: PregameGoalie = {
    athleteId: "1",
    name: "Anthony Stolarz",
    gamesPlayed: 34,
    wins: 21,
    losses: 8,
    otLosses: 3,
    goalsAgainstAverage: 2.14,
    savePct: 0.926,
    shutouts: 4,
  };

  it("writes the record as wins, losses and overtime losses", () => {
    expect(goalieRecord(goalie)).toBe("21-8-3");
  });

  it("is a dash for a goalie yet to play", () => {
    expect(goalieRecord({ ...goalie, wins: null, losses: null, otLosses: null })).toBe("-");
  });

  it("writes the save percentage the way hockey does", () => {
    expect(savePct(0.926)).toBe(".926");
    expect(savePct(0.9)).toBe(".900");
    expect(savePct(1)).toBe("1.000");
    expect(savePct(null)).toBe("-");
  });
});
