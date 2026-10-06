import type { GameHeader, Play } from "@yogan-hockey/schemas";
import { beforeAll, describe, expect, test } from "vitest";
import {
  headerAt,
  REPLAY_OPENED,
  type Replay,
  type ReplayAction,
  replayPosition,
  replayReducer,
  splitAtPlayhead,
  statusAt,
  stepMilliseconds,
} from "./replay";
import { DALLAS, play, recordedShootout } from "./test-plays";

/**
 * A short game: indexes 0 to 6. The faceoff (1) and the hit (4) are not Key plays, and neither is
 * the game's end (6).
 */
const game: Play[] = [
  play({ id: "start", type: "period-start", clock: "20:00" }),
  play({ id: "faceoff", type: "faceoff", clock: "20:00" }),
  play({ id: "shot", type: "shot-on-goal", clock: "18:10", teamId: DALLAS }),
  play({ id: "goal", type: "goal", scoring: true, clock: "12:00", homeScore: 1 }),
  play({ id: "hit", type: "hit", clock: "9:30" }),
  play({ id: "horn", type: "period-end", clock: "0:00", homeScore: 1 }),
  play({ id: "over", type: "end-of-game", clock: "0:00", homeScore: 1 }),
];

/** The replay after `actions`, stepping through Key plays unless `everyPlay`. */
function replayAfter(
  actions: ReplayAction[],
  everyPlay = false,
  from: Replay = REPLAY_OPENED,
): Replay {
  return actions.reduce((state, action) => replayReducer(state, action, game, everyPlay), from);
}

const step: ReplayAction = { type: "step" };

describe("the playhead", () => {
  test("a Replay opens with the whole game laid out, not playing, at normal speed", () => {
    expect(REPLAY_OPENED).toEqual({ playhead: null, playing: false, speed: 1 });
    expect(splitAtPlayhead(game, REPLAY_OPENED.playhead)).toEqual({ played: game, upcoming: [] });
  });

  test("play, with the whole game laid out, starts again from the first play", () => {
    expect(replayAfter([{ type: "play" }])).toEqual({ playhead: 0, playing: true, speed: 1 });
  });

  test("each step moves to the next Key play, in order", () => {
    expect(replayAfter([{ type: "play" }, step]).playhead).toBe(2);
    expect(replayAfter([{ type: "play" }, step, step]).playhead).toBe(3);
    expect(replayAfter([{ type: "play" }, step, step, step]).playhead).toBe(5);
  });

  test("with every play shown, each step moves to the next play", () => {
    expect(replayAfter([{ type: "play" }, step], true).playhead).toBe(1);
    expect(replayAfter([{ type: "play" }, step, step, step, step], true).playhead).toBe(4);
  });

  test("the step after the last one lays the whole game out and stops", () => {
    const keyPlays = replayAfter([{ type: "play" }, step, step, step, step]);
    expect(keyPlays).toEqual({ playhead: null, playing: false, speed: 1 });

    const everyPlay = replayAfter([{ type: "play" }, step, step, step, step, step, step], true);
    expect(everyPlay).toEqual({ playhead: null, playing: false, speed: 1 });
  });

  test("a step does nothing while paused", () => {
    const paused = replayAfter([{ type: "play" }, step, { type: "pause" }]);
    expect(paused).toEqual({ playhead: 2, playing: false, speed: 1 });
    expect(replayAfter([step, step], false, paused)).toEqual(paused);
  });

  test("play after a pause goes on from where it was", () => {
    const resumed = replayAfter([
      { type: "play" },
      step,
      { type: "pause" },
      { type: "play" },
      step,
    ]);
    expect(resumed).toEqual({ playhead: 3, playing: true, speed: 1 });
  });

  test("picking a play moves the playhead there, playing or paused", () => {
    expect(replayAfter([{ type: "seek", playId: "hit" }])).toEqual({
      playhead: 4,
      playing: false,
      speed: 1,
    });
    const scrubbed = replayAfter([{ type: "play" }, { type: "seek", playId: "goal" }, step]);
    expect(scrubbed).toEqual({ playhead: 5, playing: true, speed: 1 });
  });

  test("picking the game's last play lays the whole game out", () => {
    expect(replayAfter([{ type: "play" }, { type: "seek", playId: "over" }])).toEqual(
      REPLAY_OPENED,
    );
  });

  test("picking a play the game does not have changes nothing", () => {
    const playing = replayAfter([{ type: "play" }, step]);
    expect(replayAfter([{ type: "seek", playId: "nope" }], false, playing)).toBe(playing);
  });

  test("a playhead on a play that is not a Key play steps to the next Key play", () => {
    expect(
      replayAfter([{ type: "seek", playId: "faceoff" }, { type: "play" }, step]).playhead,
    ).toBe(2);
  });

  test("the end lays the whole game out and stops", () => {
    expect(replayAfter([{ type: "play" }, step, { type: "end" }])).toEqual(REPLAY_OPENED);
  });

  test("the speed changes without moving the playhead", () => {
    expect(replayAfter([{ type: "play" }, step, { type: "speed", speed: 4 }])).toEqual({
      playhead: 2,
      playing: true,
      speed: 4,
    });
  });

  test("a game with no plays never plays", () => {
    expect(replayReducer(REPLAY_OPENED, { type: "play" }, [], false)).toEqual(REPLAY_OPENED);
  });

  test("a playhead past a game that lost plays is the whole game", () => {
    expect(splitAtPlayhead(game.slice(0, 3), 5)).toEqual({
      played: game.slice(0, 3),
      upcoming: [],
    });
    const stale: Replay = { playhead: 5, playing: true, speed: 1 };
    expect(replayReducer(stale, step, game.slice(0, 3), false)).toEqual(REPLAY_OPENED);
  });
});

describe("the pace", () => {
  test("is fixed, and divided by the speed", () => {
    expect(stepMilliseconds(1)).toBe(1200);
    expect(stepMilliseconds(2)).toBe(600);
    expect(stepMilliseconds(4)).toBe(300);
  });
});

describe("what the page shows at the playhead", () => {
  test("the plays up to and including the playhead, and the ones still to come", () => {
    const { played, upcoming } = splitAtPlayhead(game, 3);
    expect(played.map((each) => each.id)).toEqual(["start", "faceoff", "shot", "goal"]);
    expect(upcoming.map((each) => each.id)).toEqual(["hit", "horn", "over"]);
  });

  test("where it is among the plays being stepped through", () => {
    expect(replayPosition(game, 3, false)).toEqual({ at: 3, of: 4 });
    expect(replayPosition(game, 3, true)).toEqual({ at: 4, of: 7 });
    expect(replayPosition(game, null, false)).toEqual({ at: 4, of: 4 });
    // Between Key plays, it has passed the ones before it.
    expect(replayPosition(game, 4, false)).toEqual({ at: 3, of: 4 });
  });

  test("the period and the clock of the play at the playhead", () => {
    expect(statusAt(game, 2)).toBe("1st 18:10");
    expect(statusAt(game, null)).toBeUndefined();
  });
});

describe("the score at the playhead", () => {
  let header: GameHeader;
  let plays: Play[];

  beforeAll(async () => {
    ({ header, plays } = await recordedShootout());
  });

  test("with the whole game laid out it is the final, shootout goal and all", () => {
    expect(headerAt(header, plays, null)).toBe(header);
    expect([header.away.score, header.home.score]).toEqual([4, 3]);
  });

  test("before the first goal it is 0-0", () => {
    const at = headerAt(header, plays, 11);
    expect([at.away.score, at.home.score]).toEqual([0, 0]);
    expect([at.away.shots, at.home.shots]).toEqual([0, 0]);
  });

  test("on a goal it is the score that goal made, and the goal is a shot", () => {
    // Dallas scores first, on the game's first shot on goal.
    const first = headerAt(header, plays, 12);
    expect([first.away.score, first.home.score]).toEqual([1, 0]);
    expect([first.away.shots, first.home.shots]).toEqual([1, 0]);
    // Buffalo ties it at play 66.
    const second = headerAt(header, plays, 66);
    expect([second.away.score, second.home.score]).toEqual([1, 1]);
    expect(second.home.shots).toBeGreaterThan(1);
  });

  test("through the shootout it stays the tie it was, whatever the plays say, and no attempt is a shot", () => {
    const lastAttempt = plays.findLastIndex((each) => each.periodText === "SO" && each.scoring);
    const at = headerAt(header, plays, lastAttempt);
    expect([at.away.score, at.home.score]).toEqual([3, 3]);
    const beforeShootout = plays.findIndex((each) => each.periodText === "SO") - 1;
    expect(at.home.shots).toBe(headerAt(header, plays, beforeShootout).home.shots);
  });

  test("the rest of the header is the game's own", () => {
    const at = headerAt(header, plays, 40);
    expect(at).toMatchObject({ status: "final", period: header.period, detail: header.detail });
  });
});
