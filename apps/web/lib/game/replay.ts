import { type GameHeader, isKeyPlay, type Play } from "@yogan-hockey/schemas";
import { playTime } from "./plays";
import { SHOOTOUT } from "./timeline";

/** How many times the fixed pace a Replay can step at. */
export const REPLAY_SPEEDS = [1, 2, 4] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

/** The fixed pace: one play every 1.2 seconds at 1x, whatever the game's real gaps were. */
const STEP_MILLISECONDS = 1200;

/** How long a Replay waits between steps at `speed`. */
export function stepMilliseconds(speed: ReplaySpeed): number {
  return STEP_MILLISECONDS / speed;
}

/**
 * Where a Replay is.
 *
 * `playhead` is the index, among every play of the game, of the last play shown; null is the
 * whole game laid out, which is how a Replay opens and where playing ends. It is an index into
 * every play, not into the Key plays, so the key-plays toggle never moves it.
 */
export type Replay = {
  playhead: number | null;
  playing: boolean;
  speed: ReplaySpeed;
};

/** A Replay as it opens: for browsing, the whole game laid out and nothing moving. */
export const REPLAY_OPENED: Replay = { playhead: null, playing: false, speed: 1 };

export type ReplayAction =
  /** The play button. With the whole game laid out it starts again from the first play. */
  | { type: "play" }
  | { type: "pause" }
  /** The pace's timer: on to the next play. Nothing while paused. */
  | { type: "step" }
  /** A tick or a play was clicked: the playhead goes there, playing or not. */
  | { type: "seek"; playId: string }
  /** Back to the whole game, stopped. */
  | { type: "end" }
  | { type: "speed"; speed: ReplaySpeed };

const WHOLE_GAME = { playhead: null, playing: false } as const;

/**
 * The Replay's rules. `plays` is every play of the game; `everyPlay` is the key-plays toggle,
 * which decides what a step lands on: the Key plays, or every play when the page lists them all.
 * The game's last play is the whole game laid out, so reaching it, by a step or a click, is the
 * end, and playing stops there.
 */
export function replayReducer(
  state: Replay,
  action: ReplayAction,
  plays: readonly Play[],
  everyPlay: boolean,
): Replay {
  switch (action.type) {
    case "play": {
      if (state.playhead != null) return { ...state, playing: true };
      const first = nextStep(plays, -1, everyPlay);
      return first == null ? state : { ...state, playhead: first, playing: true };
    }
    case "pause":
      return { ...state, playing: false };
    case "step": {
      if (!state.playing) return state;
      const next = state.playhead == null ? null : nextStep(plays, state.playhead, everyPlay);
      return next == null ? { ...state, ...WHOLE_GAME } : { ...state, playhead: next };
    }
    case "seek": {
      const index = plays.findIndex((play) => play.id === action.playId);
      if (index === -1) return state;
      return index === plays.length - 1
        ? { ...state, ...WHOLE_GAME }
        : { ...state, playhead: index };
    }
    case "end":
      return { ...state, ...WHOLE_GAME };
    case "speed":
      return { ...state, speed: action.speed };
  }
}

/** The index of the next play a step lands on after `from`, or null when the game's end is next. */
function nextStep(plays: readonly Play[], from: number, everyPlay: boolean): number | null {
  for (let index = from + 1; index < plays.length - 1; index++) {
    const play = plays[index];
    if (play && (everyPlay || isKeyPlay(play))) return index;
  }
  return null;
}

/** Whether the playhead is on a play short of the game's last: null and anything past it are not. */
function midGame(plays: readonly Play[], playhead: number | null): playhead is number {
  return playhead != null && playhead < plays.length - 1;
}

/** The plays a Replay draws at its playhead, and the ones it has not reached. */
export function splitAtPlayhead(
  plays: readonly Play[],
  playhead: number | null,
): { played: readonly Play[]; upcoming: readonly Play[] } {
  if (!midGame(plays, playhead)) return { played: plays, upcoming: [] };
  return { played: plays.slice(0, playhead + 1), upcoming: plays.slice(playhead + 1) };
}

/** "Key play 41 of 120": how far the playhead is through the plays being stepped through. */
export function replayPosition(
  plays: readonly Play[],
  playhead: number | null,
  everyPlay: boolean,
): { at: number; of: number } {
  const counts = (play: Play) => everyPlay || isKeyPlay(play);
  const of = plays.filter(counts).length;
  if (!midGame(plays, playhead)) return { at: of, of };
  return { at: plays.slice(0, playhead + 1).filter(counts).length, of };
}

/** The words over centre ice at the playhead, "2nd 4:24"; undefined with the whole game laid out. */
export function statusAt(plays: readonly Play[], playhead: number | null): string | undefined {
  const play = midGame(plays, playhead) ? plays[playhead] : undefined;
  return play && playTime(play);
}

/**
 * The header a Replay hands the rink at its playhead: the game's own with the score and the shots
 * as they stood after that play. With the whole game laid out it is the header untouched, because
 * only the header has the final score: a shootout's winner gets a goal no play carries.
 *
 * Shots are counted from the plays (shots on goal and goals, the shootout's attempts left out),
 * since ESPN gives a running score on every play and no running shots.
 */
export function headerAt(
  header: GameHeader,
  plays: readonly Play[],
  playhead: number | null,
): GameHeader {
  if (!midGame(plays, playhead)) return header;
  // A shootout's plays carry a running score that is not the game's (3-2 through a 3-3 shootout
  // in the recorded one), so the score is the last one from before it.
  const scored = plays.slice(0, playhead + 1).findLast((play) => play.periodText !== SHOOTOUT);
  const shots = (teamId: string) =>
    plays
      .slice(0, playhead + 1)
      .filter(
        (play) =>
          play.teamId === teamId &&
          play.periodText !== SHOOTOUT &&
          (play.scoring || play.type === "shot-on-goal"),
      ).length;
  return {
    ...header,
    home: { ...header.home, score: scored?.homeScore ?? 0, shots: shots(header.home.id) },
    away: { ...header.away, score: scored?.awayScore ?? 0, shots: shots(header.away.id) },
  };
}
