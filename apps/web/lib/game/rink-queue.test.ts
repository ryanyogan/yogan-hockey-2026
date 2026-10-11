import type { Play } from "@yogan-hockey/schemas";
import { describe, expect, test } from "vitest";
import {
  MAX_WAITING,
  queuePace,
  RINK_QUEUE_OPENED,
  type RinkCue,
  type RinkQueue,
  type RinkScene,
  rinkQueueReducer,
} from "./rink-queue";
import { BUFFALO, DALLAS, play } from "./test-plays";

/** A short game. Buffalo, at home, shoots right; Dallas shoots left. */
const game: Play[] = [
  play({ id: "start", type: "period-start", teamId: null }),
  play({ id: "save", type: "shot-on-goal", coordinate: { x: 60, y: 0 } }),
  play({ id: "faceoff", type: "faceoff", coordinate: { x: 69, y: 22 } }),
  play({ id: "miss", type: "shot-missed", coordinate: { x: 70, y: 10 } }),
  play({ id: "nowhere", type: "shot-on-goal", coordinate: null }),
  play({ id: "goal", type: "goal", scoring: true, teamId: DALLAS, coordinate: { x: -87, y: 7 } }),
  play({ id: "blocked", type: "shot-blocked", coordinate: { x: 50, y: 0 } }),
  play({ id: "late", type: "shot-on-goal", coordinate: { x: 75, y: -8 } }),
  play({ id: "horn", type: "period-end", teamId: null }),
];
const index = (id: string) => game.findIndex((each) => each.id === id);

/** The page following a game that has reached `lastId`: the latest play in focus. */
const live = (lastId: string, plays: readonly Play[] = game): RinkScene => {
  const soFar = plays.slice(0, plays.findIndex((each) => each.id === lastId) + 1);
  return { game: soFar, plays: soFar, homeTeamId: BUFFALO, focusId: lastId, picked: false };
};
/** A Replay with its playhead on `id`: the rest of the game is known and not yet played. */
const replayAt = (id: string): RinkScene => ({
  game,
  plays: game.slice(0, index(id) + 1),
  homeTeamId: BUFFALO,
  focusId: id,
  picked: true,
});
const wholeGame: RinkScene = {
  game,
  plays: game,
  homeTeamId: BUFFALO,
  focusId: "horn",
  picked: false,
};

type Step = RinkScene | "finished";

/** The queue after each step; "finished" is the player reporting the cue on the ice played out. */
function run(steps: Step[], from: RinkQueue = RINK_QUEUE_OPENED): RinkQueue {
  return steps.reduce(
    (queue, step) =>
      step === "finished"
        ? queue.current == null
          ? queue
          : rinkQueueReducer(queue, { type: "finished", cue: queue.current })
        : rinkQueueReducer(queue, { type: "scene", scene: step }),
    from,
  );
}

const named = (cue: RinkCue | null) =>
  cue == null ? null : cue.kind === "clear" ? "clear" : `${cue.kind}:${cue.playId}`;
const waiting = (queue: RinkQueue) => queue.waiting.map(named);

/** Plays the queue out, and says what was on the ice in turn. */
function playedOut(queue: RinkQueue): (string | null)[] {
  const seen = [named(queue.current)];
  let now = queue;
  while (now.playing) {
    now = run(["finished"], now);
    if (now.playing || named(now.current) !== seen.at(-1)) seen.push(named(now.current));
  }
  return seen;
}

describe("a Game Stream", () => {
  test("a page opening plays nothing, however much of the game there already is", () => {
    const opened = run([live("late")]);
    expect(opened.current).toBeNull();
    expect(opened.playing).toBe(false);
    expect(opened.waiting).toEqual([]);
  });

  test("a shot that arrives is played, and stays on the ice as it ended", () => {
    const arrived = run([live("start"), live("save")]);
    expect(arrived.current).toMatchObject({ kind: "save", playId: "save", end: "right" });
    expect(arrived.playing).toBe(true);
    const done = run(["finished"], arrived);
    expect(done.playing).toBe(false);
    expect(named(done.current)).toBe("save:save");
  });

  test("a burst is played one at a time, in the game's order, to its end", () => {
    const burst = run([live("start"), live("goal")]);
    expect(named(burst.current)).toBe("save:save");
    expect(waiting(burst)).toEqual(["miss:miss", "goal:goal"]);
    expect(playedOut(burst)).toEqual(["save:save", "miss:miss", "goal:goal"]);
  });

  test("plays that arrive while one is playing wait their turn behind it", () => {
    const queue = run([live("start"), live("save"), live("miss"), live("goal")]);
    expect(named(queue.current)).toBe("save:save");
    expect(playedOut(queue)).toEqual(["save:save", "miss:miss", "goal:goal"]);
  });

  test("a play with no coordinate, or no shot to draw, is never put on the ice", () => {
    // The miss, a shot ESPN gave no place, a goal, a blocked shot: two of the four are drawn.
    const queue = run([live("faceoff"), live("blocked")]);
    expect(playedOut(queue)).toEqual(["miss:miss", "goal:goal"]);
    // Arriving alone, the shot with no place changes nothing.
    const quiet = run([live("miss"), live("nowhere")]);
    expect(quiet.current).toBeNull();
    expect(quiet.playing).toBe(false);
    expect(quiet.waiting).toEqual([]);
  });

  test("the last shot stays on the ice as it ended while plays with nothing to draw arrive", () => {
    const queue = run([live("start"), live("faceoff")]);
    expect(playedOut(queue)).toEqual(["save:save"]);
    expect(queue.waiting).toEqual([]);
    expect(queuePace(queue)).toBe(1);
  });

  test("the whole game arriving on a page that had none of it is the page opening", () => {
    const empty: RinkScene = { ...live("start"), game: [], plays: [], focusId: null };
    const arrived = run([empty, live("late")]);
    expect(arrived.current).toBeNull();
    expect(arrived.playing).toBe(false);
    // And from there the game is followed.
    const more = [...game, play({ id: "next", type: "shot-on-goal", coordinate: { x: 70, y: 0 } })];
    expect(named(run([live("next", more)], arrived).current)).toBe("save:next");
  });

  test("a long burst never stalls: only the latest few wait, in order, and the pace rises", () => {
    const shots = Array.from({ length: 12 }, (_, at) =>
      play({ id: `shot-${at}`, type: "shot-on-goal", coordinate: { x: 50 + at, y: 0 } }),
    );
    const plays = [game[0] as Play, ...shots];
    const queue = run([live("start", plays), live("shot-11", plays)]);
    expect(queue.waiting).toHaveLength(MAX_WAITING);
    expect(playedOut(queue)).toEqual([
      "save:shot-8",
      "save:shot-9",
      "save:shot-10",
      "save:shot-11",
    ]);
    expect(queuePace(queue)).toBe(1 + MAX_WAITING);
    expect(queuePace(run(["finished", "finished", "finished"], queue))).toBe(1);
  });

  test("the same plays sent again, as the Game Agent does on reconnecting, play nothing", () => {
    const shown = run([live("start"), live("save"), "finished"]);
    const again = run([{ ...live("save"), plays: [...live("save").plays] }], shown);
    expect(again.current).toBe(shown.current);
    expect(again.playing).toBe(false);
  });

  test("a report that the cue on the ice finished is ignored once another has replaced it", () => {
    const first = run([live("start"), live("save")]);
    const second = run(["finished", live("miss")], first);
    expect(named(second.current)).toBe("miss:miss");
    const stale = rinkQueueReducer(second, { type: "finished", cue: first.current as RinkCue });
    expect(stale).toBe(second);
  });

  test("a shot from a team's own half goes to the net that team attacks", () => {
    const shots = [60, 72, 81].map((x, at) =>
      play({ id: `right-${at}`, type: "shot-on-goal", coordinate: { x, y: 0 } }),
    );
    const long = play({ id: "long", type: "goal", scoring: true, coordinate: { x: -40, y: 0 } });
    const plays = [...shots, long];
    const queue = run([live("right-2", plays), live("long", plays)]);
    expect(queue.current).toMatchObject({ kind: "goal", playId: "long", end: "right" });
  });
});

describe("a picked play", () => {
  test("a Replay stepping forwards plays each play it lands on, alone", () => {
    const stepped = run([wholeGame, replayAt("save"), replayAt("miss")]);
    expect(named(stepped.current)).toBe("miss:miss");
    expect(stepped.playing).toBe(true);
    expect(stepped.waiting).toEqual([]);
  });

  test("stepping backwards plays the earlier play and leaves nothing of the later one", () => {
    const back = run([wholeGame, replayAt("goal"), replayAt("save")]);
    expect(named(back.current)).toBe("save:save");
    expect(back.waiting).toEqual([]);
  });

  test("a step onto a play with nothing to draw clears the ice", () => {
    for (const id of ["faceoff", "nowhere", "blocked"]) {
      const stepped = run([wholeGame, replayAt("save"), replayAt(id)]);
      expect(named(stepped.current)).toBe("clear");
      expect(stepped.playing).toBe(false);
    }
  });

  test("back to the whole game clears the ice and plays none of what was skipped", () => {
    const whole = run([wholeGame, replayAt("save"), wholeGame]);
    expect(named(whole.current)).toBe("clear");
    expect(whole.playing).toBe(false);
    expect(whole.waiting).toEqual([]);
  });

  test("a play picked during a Game Stream is played; plays arriving meanwhile are not", () => {
    const picked = run([live("miss"), { ...live("miss"), focusId: "save", picked: true }]);
    expect(named(picked.current)).toBe("save:save");
    const arrived = run(["finished", { ...live("goal"), focusId: "save", picked: true }], picked);
    expect(named(arrived.current)).toBe("save:save");
    expect(arrived.playing).toBe(false);
    // Following the game again clears the picked play and waits for the next to arrive.
    const following = run([live("goal"), live("late")], arrived);
    expect(playedOut(following)).toEqual(["save:late"]);
  });

  test("the same play in focus on another render plays nothing again", () => {
    const shown = run([wholeGame, replayAt("save"), "finished"]);
    expect(run([{ ...replayAt("save") }], shown).playing).toBe(false);
  });
});

describe("a revised game", () => {
  test("a play taken back leaves nothing of itself on the ice", () => {
    const shown = run([live("start"), live("save"), "finished"]);
    const without = { ...live("start"), focusId: "start" };
    expect(named(run([without], shown).current)).toBe("clear");
  });

  test("a save revised to a goal is played again as the goal", () => {
    const shown = run([live("start"), live("save"), "finished"]);
    const revised = game.map((each) =>
      each.id === "save" ? { ...each, type: "goal", scoring: true } : each,
    );
    const again = run([live("save", revised)], shown);
    expect(named(again.current)).toBe("goal:save");
    expect(again.playing).toBe(true);
  });

  test("an overturned goal leaves no lamp, tint or score behind: the ice is cleared", () => {
    const scored = run([live("nowhere"), live("goal"), "finished"]);
    expect(named(scored.current)).toBe("goal:goal");
    const overturned = game.filter((each) => each.id !== "goal");
    const after = run([live("nowhere", overturned)], scored);
    expect(named(after.current)).toBe("clear");
    expect(after.playing).toBe(false);
  });

  test("a goal overturned while its sequence is playing is cut off", () => {
    const scoring = run([live("nowhere"), live("goal")]);
    expect(scoring.playing).toBe(true);
    const overturned = game.filter((each) => each.id !== "goal");
    expect(named(run([live("nowhere", overturned)], scoring).current)).toBe("clear");
  });

  test("a goal overturned to a save is played again as the save", () => {
    const scored = run([live("nowhere"), live("goal"), "finished"]);
    const revised = game.map((each) =>
      each.id === "goal" ? { ...each, type: "shot-on-goal", scoring: false } : each,
    );
    const again = run([live("goal", revised)], scored);
    expect(named(again.current)).toBe("save:goal");
    expect(again.current).not.toHaveProperty("score");
  });

  test("a goal given to another scorer is played again with the new name", () => {
    const credit = (name: string) =>
      game.map((each) =>
        each.id === "goal"
          ? { ...each, participants: [{ athleteId: "1", name, shortName: name, role: "scorer" }] }
          : each,
      );
    const scored = run([live("nowhere", credit("Jamie Benn")), live("goal", credit("Jamie Benn"))]);
    expect(scored.current).toMatchObject({ kind: "goal", scorer: "Jamie Benn" });
    const settled = run(["finished"], scored);
    const again = run([live("goal", credit("Esa Lindell"))], settled);
    expect(again.current).toMatchObject({ kind: "goal", scorer: "Esa Lindell" });
    expect(again.playing).toBe(true);
  });

  test("a goal knows its side, its colour and the score before it from the scene", () => {
    const scored = game.map((each) => (each.id === "goal" ? { ...each, awayScore: 1 } : each));
    const colours = { homeColour: "00468b", awayColour: "20864c" };
    const queue = run([
      { ...live("nowhere", scored), ...colours },
      { ...live("goal", scored), ...colours },
    ]);
    expect(queue.current).toMatchObject({
      kind: "goal",
      side: "away",
      tint: { light: "#20864c", dark: "#489c6c" },
      score: { from: 0, to: 1 },
    });
  });

  test("a waiting play that is taken back is not played", () => {
    const burst = run([live("start"), live("miss")]);
    const without = game.filter((each) => each.id !== "miss");
    const queue = run([live("faceoff", without)], burst);
    expect(playedOut(queue)).toEqual(["save:save"]);
  });

  test("the latest play taken back as another arrives: the new one is still played", () => {
    const shown = run([live("start"), live("faceoff"), "finished"]);
    const rewritten = game.filter((each) => each.id !== "faceoff");
    const queue = run([live("miss", rewritten)], shown);
    expect(playedOut(queue)).toEqual(["miss:miss"]);
  });
});
