import type { Play } from "@yogan-hockey/schemas";
import { describe, expect, test } from "vitest";
import { describePlay } from "./rink-animation";
import { play, recordedShootout } from "./test-plays";

const save = (over: Partial<Play> = {}) => play({ type: "shot-on-goal", ...over });
const miss = (over: Partial<Play> = {}) => play({ type: "shot-missed", ...over });
const goal = (over: Partial<Play> = {}) => play({ type: "goal", scoring: true, ...over });

/** `describePlay` for a play that is a shot: its line, or null. */
function describeShot(...of: Parameters<typeof describePlay>) {
  const drawn = describePlay(...of);
  return drawn?.kind === "penalty" ? null : drawn;
}

describe("describePlay", () => {
  test("a save is a line from where the shot was taken to the edge of the crease", () => {
    // Straight out from the right-hand net (89, 0): 29 feet away, stopped 6 feet short of it.
    expect(describeShot(save({ id: "s", coordinate: { x: 60, y: 0 } }), null)).toEqual({
      kind: "save",
      playId: "s",
      end: "right",
      from: { x: 60, y: 0 },
      to: { x: 83, y: 0 },
      distance: 29,
    });
  });

  test("a save from an angle stops on the crease along the shot's own line", () => {
    // From the left end's upper faceoff dot: 20 across and 22 up from the net, 29.73 feet.
    const drawn = describeShot(save({ coordinate: { x: -69, y: 22 } }), null);
    expect(drawn?.end).toBe("left");
    expect(drawn?.from).toEqual({ x: -69, y: -22 });
    expect(drawn?.to.x).toBeCloseTo(-84.964, 3);
    expect(drawn?.to.y).toBeCloseTo(-4.44, 3);
    expect(drawn?.distance).toBeCloseTo(29.732, 3);
  });

  test("a save from inside the crease stops where it was taken", () => {
    const drawn = describeShot(save({ coordinate: { x: 86, y: 0 } }), null);
    expect(drawn?.to).toEqual({ x: 86, y: 0 });
  });

  test("a miss runs wide of the far post to the end boards", () => {
    // Taken above the net's line on the drawing, it crosses and goes wide below; and the reverse.
    expect(describeShot(miss({ coordinate: { x: 70, y: 10 } }), null)).toMatchObject({
      kind: "miss",
      end: "right",
      from: { x: 70, y: -10 },
      to: { x: 97, y: 7 },
    });
    expect(describeShot(miss({ coordinate: { x: -70, y: -10 } }), null)).toMatchObject({
      kind: "miss",
      end: "left",
      from: { x: -70, y: 10 },
      to: { x: -97, y: -7 },
    });
  });

  test("a goal runs into the net", () => {
    // Bourque's goal for Dallas in the recorded game, from beside the left-hand net.
    expect(describeShot(goal({ id: "g", coordinate: { x: -87, y: 7 } }), null)).toMatchObject({
      kind: "goal",
      playId: "g",
      end: "left",
      from: { x: -87, y: -7 },
      to: { x: -90.6, y: 0 },
    });
  });

  test("a shot goes to the end its team attacks, when that is known: an empty-net goal from its own half", () => {
    const emptyNetter = goal({ coordinate: { x: -40, y: 0 } });
    expect(describeShot(emptyNetter, null, "right")).toMatchObject({
      end: "right",
      to: { x: 90.6, y: 0 },
      distance: 129,
    });
    // With no telling which end, the nearer one.
    expect(describeShot(emptyNetter, null, null)?.end).toBe("left");
    expect(describeShot(save({ coordinate: { x: 0, y: 0 } }), null)?.end).toBe("right");
  });

  test.each([
    ["a save", save()],
    ["a miss", miss()],
    ["a goal", goal()],
  ])("%s without a coordinate is not drawn", (_name, without) => {
    expect(describeShot(without, null, "left")).toBeNull();
  });

  test.each([
    // ESPN records a blocked shot where the blocker stood, so there is no line to draw.
    ["a blocked shot", "shot-blocked", false],
    ["a hit", "hit", false],
    ["a faceoff", "faceoff", false],
  ])("%s has no shot to draw, coordinate or not", (_name, type, penalty) => {
    expect(describeShot(play({ type, penalty, coordinate: { x: 50, y: 5 } }), null)).toBeNull();
  });

  test("a penalty is a whistle where it was called, with no line", () => {
    const hooking = play({ id: "p", type: "Hooking", penalty: true, coordinate: { x: 50, y: 5 } });
    expect(describePlay(hooking, null, "left")).toEqual({
      kind: "penalty",
      playId: "p",
      at: { x: 50, y: -5 },
    });
  });

  test("a penalty without a coordinate is given no place on the ice", () => {
    expect(describePlay(play({ type: "Hooking", penalty: true }), null)).toBeNull();
  });

  test("in the recorded game every goal, save and miss with a coordinate is drawn, inside the boards", async () => {
    const { plays } = await recordedShootout();
    const drawn = plays.flatMap((each, index) => {
      const description = describeShot(each, plays[index - 1] ?? null);
      return description ? [{ each, description }] : [];
    });
    const shots = plays.filter(
      (each) =>
        each.coordinate != null &&
        (each.scoring || each.type === "shot-on-goal" || each.type === "shot-missed"),
    );
    expect(drawn.map(({ each }) => each.id)).toEqual(shots.map((each) => each.id));
    expect(drawn.length).toBeGreaterThan(60);
    for (const { each, description } of drawn) {
      expect(each.coordinate).not.toBeNull();
      expect(Math.abs(description.to.x)).toBeLessThanOrEqual(100);
      expect(Math.abs(description.to.y)).toBeLessThanOrEqual(42.5);
    }
  });
});
