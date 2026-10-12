import type { Play } from "@yogan-hockey/schemas";
import { SHOOTOUT } from "./timeline";

/** The two sides of the game a play belongs to, as far as a goal's sequence needs them. */
export type GoalTeams = { homeTeamId: string };

/** A goal scored a skater up or a skater down; null at even strength, which is not remarked on. */
export type GoalStrength = "power-play" | "short-handed";

/** What a goal says in words (the caption on and under the ice). */
export type GoalCall = {
  /** The scorer's name; null when ESPN names nobody and the play's words do not either. */
  scorer: string | null;
  /** The scorer's goals this season, as ESPN writes them after "Goal": "20". */
  tally: string | null;
  /** The rest of the play's words: the shot and the assists. */
  how: string;
  strength: GoalStrength | null;
  /** A shootout's goal, which leaves the running score where it was. */
  shootout: boolean;
};

/** What a goal plays besides its shot's line (`RinkAnimation`'s `goal` member). */
export type GoalSequence = {
  /** The side whose score is the one that changes. */
  side: "home" | "away";
  /**
   * The scoring side's score before and after, for the roll. Null for a goal that changes no
   * score: a shootout's, or one whose running score ESPN has not moved.
   */
  score: { from: number; to: number } | null;
  scorer: string | null;
  strength: GoalStrength | null;
  shootout: boolean;
};

/** What `strength` says in a caption: "power play · Wrist Shot". */
export const STRENGTH_WORDS: Record<GoalStrength, string> = {
  "power-play": "power play",
  "short-handed": "short-handed",
};

/**
 * The words of a goal, from ESPN's sentence: "Esa Lindell Goal (6) Wrist Shot, assists: Jamie
 * Benn (21)". A shootout's has no tally: "Matt Duchene Goal Backhand".
 */
export function goalCall(play: Play): GoalCall {
  const shootout = play.periodText === SHOOTOUT;
  const words = /^(.*?)\s*\bGoal\b(?:\s*\((\d+)\))?\s*(.*)$/.exec(play.text);
  const named = play.participants.find((participant) => participant.role === "scorer")?.name;
  return {
    scorer: named ?? (words?.[1] || null),
    tally: words?.[2] ?? null,
    how: words ? (words[3] ?? "") : play.text,
    // ESPN gives a shootout's goals a strength too, which means nothing there.
    strength: !shootout && isStrength(play.strength) ? play.strength : null,
    shootout,
  };
}

const isStrength = (strength: string | null): strength is GoalStrength =>
  strength != null && Object.hasOwn(STRENGTH_WORDS, strength);

/**
 * What a goal plays besides its line. `previous` is the play before it in the game, which holds
 * the score the roll starts from; the game's first play rolls from one fewer.
 */
export function goalSequence(play: Play, previous: Play | null, teams: GoalTeams): GoalSequence {
  const side = play.teamId === teams.homeTeamId ? "home" : "away";
  const { scorer, strength, shootout } = goalCall(play);
  const to = side === "home" ? play.homeScore : play.awayScore;
  const from =
    previous == null ? to - 1 : side === "home" ? previous.homeScore : previous.awayScore;
  return {
    side,
    score: shootout || from < 0 || to <= from ? null : { from, to },
    scorer,
    strength,
    shootout,
  };
}
