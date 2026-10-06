import { describe, expect, test } from "vitest";
import { play, recordedShootout } from "./test-plays";
import { layoutTimeline } from "./timeline";

const REGULAR_SEASON = 2;
const PLAYOFFS = 3;

describe("layoutTimeline", () => {
  test("a game in regulation is three equal periods, shown before they are played", () => {
    const { periods } = layoutTimeline([], { period: 1, seasonType: REGULAR_SEASON });
    expect(periods.map((p) => p.label)).toEqual(["1st", "2nd", "3rd"]);
    expect(periods.map((p) => p.start)).toEqual([0, 1 / 3, 2 / 3]);
    expect(periods.map((p) => p.width)).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });

  test("a play sits where its clock, which counts up, puts it in its period", () => {
    const start = play({ period: 1, clock: "0:00" });
    const halfway = play({ period: 2, periodText: "2nd", clock: "10:00" });
    const end = play({ period: 3, periodText: "3rd", clock: "20:00" });
    const { positions } = layoutTimeline([start, halfway, end], {
      period: 3,
      seasonType: REGULAR_SEASON,
    });
    expect(positions.get(start.id)).toBe(0);
    expect(positions.get(halfway.id)).toBe(0.5);
    expect(positions.get(end.id)).toBe(1);
  });

  test("regular-season overtime is five minutes: a quarter the width of a period", () => {
    const winner = play({ period: 4, periodText: "OT", clock: "2:30", scoring: true });
    const { periods, positions } = layoutTimeline([winner], {
      period: 4,
      seasonType: REGULAR_SEASON,
    });
    expect(periods.map((p) => p.label)).toEqual(["1st", "2nd", "3rd", "OT"]);
    expect(periods.map((p) => p.width * 65)).toEqual([20, 20, 20, 5]);
    expect(positions.get(winner.id)).toBeCloseTo(62.5 / 65);
  });

  test("playoff overtime is a full period, and there can be more than one", () => {
    const late = play({ period: 5, periodText: "2OT", clock: "10:00" });
    const { periods, positions } = layoutTimeline([late], { period: 5, seasonType: PLAYOFFS });
    expect(periods.map((p) => p.label)).toEqual(["1st", "2nd", "3rd", "OT", "2OT"]);
    expect(periods.every((p) => p.width === 1 / 5)).toBe(true);
    expect(positions.get(late.id)).toBeCloseTo(0.9);
  });

  test("a shootout about to start, with no play of its own yet, has its part", () => {
    const { periods } = layoutTimeline([play({ period: 3, periodText: "3rd", clock: "20:00" })], {
      period: 5,
      seasonType: REGULAR_SEASON,
    });
    expect(periods.map((p) => p.label)).toEqual(["1st", "2nd", "3rd", "OT", "SO"]);
  });

  test("a play of the shootout that ESPN words otherwise still gets a slot in it", () => {
    const attempt = play({ period: 5, periodText: "SO" });
    const stray = play({ period: 5, periodText: "", type: "period-end" });
    const { periods, positions } = layoutTimeline([attempt, stray], {
      period: 5,
      seasonType: REGULAR_SEASON,
    });
    const shootout = periods[4];
    expect(positions.get(stray.id)).toBeGreaterThan(positions.get(attempt.id) ?? 1);
    expect(positions.get(attempt.id)).toBeGreaterThan(shootout?.start ?? 1);
  });

  test("an overtime with no play yet is named from the game's period", () => {
    const { periods } = layoutTimeline([], { period: 4, seasonType: REGULAR_SEASON });
    expect(periods.map((p) => p.label)).toEqual(["1st", "2nd", "3rd", "OT"]);
  });

  test("the recorded shootout: five parts, with the shootout's plays, all at 0:00, spread in order", async () => {
    const { header, plays } = await recordedShootout();
    const { periods, positions } = layoutTimeline(plays, header);
    expect(periods.map((p) => p.label)).toEqual(["1st", "2nd", "3rd", "OT", "SO"]);
    // 20 + 20 + 20 + 5 minutes, and the shootout given the room of 8.
    expect(periods.map((p) => Math.round(p.start * 73))).toEqual([0, 20, 40, 60, 65]);

    const shootout = plays.filter((p) => p.periodText === "SO");
    const places = shootout.map((p) => positions.get(p.id) ?? Number.NaN);
    expect(places.every((at, i) => i === 0 || at > (places[i - 1] ?? 0))).toBe(true);
    expect(Math.min(...places)).toBeGreaterThan(65 / 73);
    expect(Math.max(...places)).toBeLessThan(1);
  });

  test("the first goal of the recorded game, 2:19 into the 1st", async () => {
    const { header, plays } = await recordedShootout();
    const { positions } = layoutTimeline(plays, header);
    const goal = plays.find((p) => p.scoring);
    expect(positions.get(goal?.id ?? "")).toBeCloseTo((2 + 19 / 60) / 73);
  });

  test("every play has a place between the ends", async () => {
    const { header, plays } = await recordedShootout();
    const { positions } = layoutTimeline(plays, header);
    expect(positions.size).toBe(plays.length);
    expect([...positions.values()].every((at) => at >= 0 && at <= 1)).toBe(true);
  });

  test("a clock past the end of its period stays inside the period", () => {
    const odd = play({ period: 1, clock: "21:15" });
    const { positions } = layoutTimeline([odd], { period: 1, seasonType: REGULAR_SEASON });
    expect(positions.get(odd.id)).toBe(1 / 3);
  });
});
