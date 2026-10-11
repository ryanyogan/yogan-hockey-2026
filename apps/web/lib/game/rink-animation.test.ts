import type { Play } from "@yogan-hockey/schemas";
import { describe, expect, test } from "vitest";
import { goalCall } from "./goal";
import { describePlay } from "./rink-animation";
import { BUFFALO, DALLAS, play, recordedShootout } from "./test-plays";

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

describe("a goal's sequence", () => {
  /** The recorded game's sides: Buffalo at home in navy, Dallas away in green. */
  const teams = { homeTeamId: BUFFALO, homeColour: "00468b", awayColour: "20864c" };
  const scorer = (name: string) => [
    { athleteId: "1", name, shortName: name, role: "scorer" },
    { athleteId: "2", name: "Somebody Else", shortName: "S. Else", role: "assister" },
  ];
  const before = play({ homeScore: 1, awayScore: 1 });

  test("an even-strength goal: the lamp's end, the team's colour, the score rolling up, the scorer", () => {
    const bourque = goal({
      id: "g",
      teamId: DALLAS,
      coordinate: { x: -87, y: 7 },
      strength: "even-strength",
      homeScore: 1,
      awayScore: 2,
      text: "Mavrik Bourque Goal (20) Snap Shot, assists: Esa Lindell (26), Ilya Lyubushkin (8)",
      participants: scorer("Mavrik Bourque"),
    });
    expect(describePlay(bourque, before, "left", teams)).toEqual({
      kind: "goal",
      playId: "g",
      end: "left",
      from: { x: -87, y: -7 },
      to: { x: -90.6, y: 0 },
      distance: Math.hypot(2, 7),
      side: "away",
      // Green shows on white ice as it is, and is lifted a step to show on slate.
      tint: { light: "#20864c", dark: "#489c6c" },
      score: { from: 1, to: 2 },
      scorer: "Mavrik Bourque",
      strength: null,
      shootout: false,
    });
  });

  test("a power-play goal says so", () => {
    const lindell = goal({
      teamId: DALLAS,
      coordinate: { x: 60, y: 10 },
      strength: "power-play",
      homeScore: 1,
      awayScore: 2,
      participants: scorer("Esa Lindell"),
    });
    expect(describePlay(lindell, before, "right", teams)).toMatchObject({
      side: "away",
      score: { from: 1, to: 2 },
      scorer: "Esa Lindell",
      strength: "power-play",
      shootout: false,
    });
  });

  test("a short-handed goal says so, for the home team in a colour too dark for slate", () => {
    const benson = goal({
      teamId: BUFFALO,
      coordinate: { x: 70, y: 0 },
      strength: "short-handed",
      homeScore: 2,
      awayScore: 1,
      participants: scorer("Zach Benson"),
    });
    expect(describePlay(benson, before, "right", teams)).toMatchObject({
      side: "home",
      // Navy would vanish on slate: lifted towards white until it stands off the page.
      tint: { light: "#00468b", dark: "#5482b1" },
      score: { from: 1, to: 2 },
      scorer: "Zach Benson",
      strength: "short-handed",
    });
  });

  test("a shootout goal is a goal that leaves the score where it was", () => {
    // The recorded shootout's plays carry 3-2 through a 3-3 shootout: not a score to roll to.
    const robertson = goal({
      teamId: DALLAS,
      period: 5,
      periodText: "SO",
      coordinate: { x: -80, y: 0 },
      strength: "even-strength",
      homeScore: 3,
      awayScore: 2,
      text: "Jason Robertson Goal Snap Shot",
      participants: scorer("Jason Robertson"),
    });
    const earlier = play({ period: 5, periodText: "SO", homeScore: 3, awayScore: 1 });
    expect(describePlay(robertson, earlier, "left", teams)).toMatchObject({
      kind: "goal",
      side: "away",
      score: null,
      scorer: "Jason Robertson",
      strength: null,
      shootout: true,
    });
  });

  test("the game's first play being a goal rolls from one fewer", () => {
    const first = goal({ teamId: BUFFALO, coordinate: { x: 70, y: 0 }, homeScore: 1 });
    expect(describePlay(first, null, "right", teams)).toMatchObject({ score: { from: 0, to: 1 } });
  });

  test("a goal whose score ESPN has not moved yet rolls nothing", () => {
    const lagging = goal({
      teamId: BUFFALO,
      coordinate: { x: 70, y: 0 },
      homeScore: 1,
      awayScore: 1,
    });
    expect(describePlay(lagging, before, "right", teams)).toMatchObject({ score: null });
  });

  test("a scorer ESPN gave no role is read from the play's words, and a team with no colour has no tint", () => {
    const unnamed = goal({
      teamId: BUFFALO,
      coordinate: { x: 70, y: 0 },
      homeScore: 2,
      awayScore: 1,
      text: "Josh Norris Goal (13) Wrist Shot, assists: Zach Benson (30), Owen Power (20)",
    });
    expect(
      describePlay(unnamed, before, "right", { homeTeamId: BUFFALO, homeColour: null }),
    ).toMatchObject({ scorer: "Josh Norris", tint: null });
  });

  test("a save says none of it", () => {
    const stopped = describePlay(save({ coordinate: { x: 60, y: 0 } }), before, "right", teams);
    expect(stopped).not.toHaveProperty("score");
    expect(stopped).not.toHaveProperty("tint");
  });

  test("the words of a goal: its scorer, the tally, how, and the strength", () => {
    expect(
      goalCall(
        goal({
          strength: "power-play",
          text: "Esa Lindell Goal (6) Wrist Shot, assists: Jamie Benn (21), Justin Hryckowian (16)",
          participants: scorer("Esa Lindell"),
        }),
      ),
    ).toEqual({
      scorer: "Esa Lindell",
      tally: "6",
      how: "Wrist Shot, assists: Jamie Benn (21), Justin Hryckowian (16)",
      strength: "power-play",
      shootout: false,
    });
    expect(
      goalCall(
        goal({ periodText: "SO", strength: "even-strength", text: "Matt Duchene Goal Backhand" }),
      ),
    ).toEqual({
      scorer: "Matt Duchene",
      tally: null,
      how: "Backhand",
      strength: null,
      shootout: true,
    });
  });
});
