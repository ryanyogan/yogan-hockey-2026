import type { Play } from "@yogan-hockey/schemas";
import { attackedEnd } from "./rink";
import { describePlay, type RinkAnimation } from "./rink-animation";

/** One thing for the rink's player to do: play an animation, or wipe the last one off the ice. */
export type RinkCue = RinkAnimation | { kind: "clear" };

const CLEAR: RinkCue = { kind: "clear" };

/** What a game page is showing, as far as the rink's animations care. */
export type RinkScene = {
  /** Every play known, a Replay's still to come included: which end each team attacks. */
  game: readonly Play[];
  /** The plays so far, in the game's order: all of `game` but in a Replay short of its end. */
  plays: readonly Play[];
  homeTeamId: string;
  /** The play ringed and captioned. */
  focusId: string | null;
  /**
   * The focus was chosen (a Replay's playhead, a tick clicked), not the latest play of a game
   * being followed.
   */
  picked: boolean;
};

/**
 * What the rink is playing and what waits behind it.
 *
 * Only `current` is ever on the ice, so two plays cannot overlap. It stays there as it ended
 * (`playing` false) until another cue takes its place.
 */
export type RinkQueue = {
  /** The scene last seen; null until the page's first, which plays nothing. */
  scene: RinkScene | null;
  current: RinkCue | null;
  /** `current` is still running: the player reports `finished` when it has played out. */
  playing: boolean;
  /** In the game's order. */
  waiting: readonly RinkAnimation[];
};

export const RINK_QUEUE_OPENED: RinkQueue = {
  scene: null,
  current: null,
  playing: false,
  waiting: [],
};

/**
 * How many cues wait behind the one playing. A longer burst (a socket back after a minute away)
 * drops its oldest: a play that is not the latest ends as its dot, which is drawn regardless.
 */
export const MAX_WAITING = 3;

/** How many times faster than its own pace the current cue plays: quicker with more waiting. */
export function queuePace(queue: RinkQueue): number {
  return 1 + queue.waiting.length;
}

export type RinkQueueAction =
  /** The page rendered: what it shows now. */
  | { type: "scene"; scene: RinkScene }
  /** The player played `cue` out. */
  | { type: "finished"; cue: RinkCue };

/**
 * The rules for what the rink plays, the same for a Game Stream and a Replay.
 *
 * - A page opening plays nothing.
 * - Following a game, each play that arrives is played in turn, and a burst queues up.
 * - A picked play (a Replay's playhead, a clicked tick) is played at once in place of whatever
 *   was on the ice, whether it is later or earlier in the game than the last.
 * - A picked play with nothing to draw clears the ice, and so does letting go of a picked play.
 *   Following a game, the last shot stays on the ice as it ended until the next one arrives.
 * - A play taken back or revised by ESPN leaves nothing stale.
 */
export function rinkQueueReducer(queue: RinkQueue, action: RinkQueueAction): RinkQueue {
  if (action.type === "finished") {
    return queue.playing && queue.current === action.cue ? advance(queue) : queue;
  }
  const before = queue.scene;
  const after = action.scene;
  const next = { ...queue, scene: after };
  if (before == null || sameScene(before, after)) return next;

  if (after.picked) {
    const moved = !before.picked || before.focusId !== after.focusId;
    return moved ? show(next, cueFor(after, after.focusId) ?? CLEAR) : revise(next, after);
  }
  if (before.picked) return show(next, CLEAR);

  const revised = revise(next, after);
  // The game arriving whole (the socket's first word to a page that had none of it) is the page
  // opening, not plays happening.
  if (before.plays.length === 0) return revised;
  const cues: RinkAnimation[] = [];
  for (const play of arrivals(before.plays, after.plays)) {
    const cue = cueFor(after, play.id);
    if (cue) cues.push(cue);
  }
  return enqueue(revised, cues);
}

function sameScene(a: RinkScene, b: RinkScene): boolean {
  return (
    a.plays === b.plays && a.game === b.game && a.focusId === b.focusId && a.picked === b.picked
  );
}

/**
 * The plays that have arrived: those after the latest play the page already had. ESPN may have
 * taken that one back in the same breath, so the one before it is looked for, and so on.
 */
function arrivals(had: readonly Play[], plays: readonly Play[]): readonly Play[] {
  for (let at = had.length - 1; at >= 0; at--) {
    const known = plays.findLastIndex((play) => play.id === had[at]?.id);
    if (known !== -1) return plays.slice(known + 1);
  }
  return [];
}

function cueFor(scene: RinkScene, playId: string | null | undefined): RinkAnimation | null {
  const index = playId == null ? -1 : scene.plays.findIndex((play) => play.id === playId);
  const play = scene.plays[index];
  if (play == null) return null;
  const attacks =
    play.teamId == null
      ? null
      : attackedEnd(scene.game, scene.homeTeamId, play.teamId, play.period);
  return describePlay(play, scene.plays[index - 1] ?? null, attacks);
}

const sameCue = (a: RinkCue, b: RinkCue) => JSON.stringify(a) === JSON.stringify(b);

/** The queue brought up to the game as it now is: plays taken back dropped, changed ones redrawn. */
function revise(queue: RinkQueue, scene: RinkScene): RinkQueue {
  const waiting = queue.waiting.flatMap((cue) => {
    const now = cueFor(scene, cue.playId);
    return now == null ? [] : [sameCue(now, cue) ? cue : now];
  });
  const kept = { ...queue, waiting };
  const { current } = queue;
  if (current == null || current.kind === "clear") return kept;
  const now = cueFor(scene, current.playId);
  if (now == null) return advance({ ...kept, current: CLEAR, playing: false });
  return sameCue(now, current) ? kept : { ...kept, current: now, playing: true };
}

function show(queue: RinkQueue, cue: RinkCue): RinkQueue {
  return { ...queue, current: cue, playing: cue.kind !== "clear", waiting: [] };
}

/** On to the next cue waiting; with none, the current one stays on the ice as it ended. */
function advance(queue: RinkQueue): RinkQueue {
  const [next, ...waiting] = queue.waiting;
  if (next == null) return { ...queue, playing: false };
  return { ...queue, current: next, playing: true, waiting };
}

function enqueue(queue: RinkQueue, cues: readonly RinkAnimation[]): RinkQueue {
  if (cues.length === 0) return queue;
  const all = [...queue.waiting, ...cues];
  if (queue.playing) return { ...queue, waiting: all.slice(-MAX_WAITING) };
  return advance({ ...queue, waiting: all.slice(-(MAX_WAITING + 1)) });
}
