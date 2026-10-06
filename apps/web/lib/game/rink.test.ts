import { describe, expect, test } from "vitest";
import { attackedEnd, rinkPoint } from "./rink";
import { BUFFALO, DALLAS, play, recordedShootout } from "./test-plays";

describe("rinkPoint", () => {
  test("centre ice is the centre of the drawing", () => {
    expect(rinkPoint({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  test("ESPN's x is drawn as given and its y runs up the drawing", () => {
    // Bourque's goal for Dallas in the recorded game, from beside the left-hand net.
    expect(rinkPoint({ x: -87, y: 7 })).toEqual({ x: -87, y: -7 });
  });

  test("a play is not mirrored by period: the same spot is the same spot all game", async () => {
    const { plays } = await recordedShootout();
    const dots = plays.filter((p) => p.type === "faceoff" && p.coordinate);
    // Every faceoff ESPN locates is on one of the drawing's eight dots, whatever the period.
    const spots = new Set(dots.map((p) => `${rinkPoint(p.coordinate ?? { x: 0, y: 0 }).x}`));
    expect([...spots].sort()).toEqual(["-20", "-69", "20", "69"]);
  });

  test("a coordinate past the boards is pulled back onto the ice", () => {
    expect(rinkPoint({ x: 104, y: -50 })).toEqual({ x: 100, y: 42.5 });
  });
});

describe("attackedEnd", () => {
  test("in the recorded game the home team shoots right, left, right, left, then right in the shootout", async () => {
    const { plays } = await recordedShootout();
    const ends = [1, 2, 3, 4, 5].map((period) => attackedEnd(plays, BUFFALO, BUFFALO, period));
    expect(ends).toEqual(["right", "left", "right", "left", "right"]);
  });

  test("the away team shoots at the other end", async () => {
    const { plays } = await recordedShootout();
    const ends = [1, 2, 3, 4, 5].map((period) => attackedEnd(plays, BUFFALO, DALLAS, period));
    expect(ends).toEqual(["left", "right", "left", "right", "left"]);
  });

  test("the first-period end is read from the shots, not assumed: a home team may start on the left", () => {
    const plays = [
      play({ period: 1, teamId: BUFFALO, coordinate: { x: -70, y: 3 } }),
      play({ period: 1, teamId: BUFFALO, coordinate: { x: -61, y: -10 } }),
      play({ period: 1, teamId: DALLAS, coordinate: { x: 66, y: 5 } }),
    ];
    expect(attackedEnd(plays, BUFFALO, BUFFALO, 1)).toBe("left");
    expect(attackedEnd(plays, BUFFALO, DALLAS, 1)).toBe("right");
  });

  test("a period with no shots yet takes its end from the periods that have them", () => {
    const plays = [
      play({ period: 1, teamId: BUFFALO, coordinate: { x: 70, y: 3 } }),
      play({ period: 1, teamId: DALLAS, coordinate: { x: -66, y: 5 } }),
    ];
    expect(attackedEnd(plays, BUFFALO, BUFFALO, 2)).toBe("left");
    expect(attackedEnd(plays, BUFFALO, BUFFALO, 3)).toBe("right");
  });

  test("one long shot from a team's own end does not turn a period round", () => {
    const plays = [
      ...[60, 72, 81, 55].map((x) => play({ period: 1, teamId: BUFFALO, coordinate: { x, y: 0 } })),
      // Overtime, a clearance on goal from Buffalo's own end, and nothing else.
      play({ period: 4, teamId: BUFFALO, coordinate: { x: 80, y: 0 } }),
    ];
    expect(attackedEnd(plays, BUFFALO, BUFFALO, 4)).toBe("left");
  });

  test("a blocked shot is no evidence: ESPN puts it where the blocker stood", () => {
    const plays = [
      play({ type: "shot-blocked", period: 1, teamId: BUFFALO, coordinate: { x: -55, y: 0 } }),
    ];
    expect(attackedEnd(plays, BUFFALO, BUFFALO, 1)).toBeNull();
  });

  test("before any shot there is no telling", () => {
    expect(attackedEnd([], BUFFALO, BUFFALO, 1)).toBeNull();
    expect(
      attackedEnd([play({ type: "period-start", teamId: null })], BUFFALO, DALLAS, 1),
    ).toBeNull();
  });
});
