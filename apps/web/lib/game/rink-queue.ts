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
  /** In the game's order. A clear is only ever last. */
  waiting: readonly RinkCue[];
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
 * - The ice shows the play in focus or nothing: a play with nothing to draw clears it.
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

  const appended = playsAfter(before.plays.at(-1)?.id, after.plays);
  const cues: RinkCue[] = [];
  for (const play of appended ?? []) {
    const cue = cueFor(after, play.id);
    if (cue) cues.push(cue);
  }
  // The latest play has nothing to draw, or the game was rewritten under the page.
  if (appended == null || (appended.length > 0 && cueFor(after, appended.at(-1)?.id) == null)) {
    cues.push(CLEAR);
  }
  return enqueue(revise(next, after), cues);
}

function sameScene(a: RinkScene, b: RinkScene): boolean {
  return (
    a.plays === b.plays && a.game === b.game && a.focusId === b.focusId && a.picked === b.picked
  );
}

/** The plays after the one with `lastId`; all of them when there was none; null when it is gone. */
function playsAfter(lastId: string | undefined, plays: readonly Play[]): readonly Play[] | null {
  if (lastId === undefined) return plays;
  const last = plays.findLastIndex((play) => play.id === lastId);
  return last === -1 ? null : plays.slice(last + 1);
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

/** The queue with every cue brought up to the game as it now is: gone plays dropped, changed ones redrawn. */
function revise(queue: RinkQueue, scene: RinkScene): RinkQueue {
  const fresh = (cue: RinkCue) => (cue.kind === "clear" ? cue : cueFor(scene, cue.playId));
  const waiting = queue.waiting.flatMap((cue) => {
    const now = fresh(cue);
    return now == null ? [] : [sameCue(now, cue) ? cue : now];
  });
  const kept = { ...queue, waiting: tidy(waiting, true) };
  const { current } = queue;
  if (current == null || current.kind === "clear") return kept;
  const now = fresh(current);
  if (now == null) return advance({ ...kept, current: CLEAR, playing: true });
  return sameCue(now, current) ? kept : { ...kept, current: now, playing: true };
}

/** A clear only ever last, and not at all when there is nothing before it to clear. */
function tidy(cues: readonly RinkCue[], somethingShown: boolean): RinkCue[] {
  const kept = cues.filter((cue, at) => cue.kind !== "clear" || at === cues.length - 1);
  return kept.length === 1 && kept[0]?.kind === "clear" && !somethingShown ? [] : kept;
}

function show(queue: RinkQueue, cue: RinkCue): RinkQueue {
  return { ...queue, current: cue, playing: cue.kind !== "clear", waiting: [] };
}

/** On to the next cue waiting; with none, the current one stays on the ice as it ended. */
function advance(queue: RinkQueue): RinkQueue {
  const [next, ...waiting] = queue.waiting;
  if (next == null) return { ...queue, playing: false };
  return { ...queue, current: next, playing: next.kind !== "clear", waiting };
}

function enqueue(queue: RinkQueue, cues: readonly RinkCue[]): RinkQueue {
  if (cues.length === 0) return queue;
  const shown = queue.playing || (queue.current != null && queue.current.kind !== "clear");
  const all = tidy([...queue.waiting, ...cues], shown);
  if (all.length === 0) return queue;
  if (queue.playing) return { ...queue, waiting: all.slice(-MAX_WAITING) };
  return advance({ ...queue, waiting: all.slice(-(MAX_WAITING + 1)) });
}
