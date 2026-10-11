import type { Play } from "@yogan-hockey/schemas";
import { SHOOTOUT } from "./timeline";

/** The two sides of the game a play belongs to, as far as a goal's sequence needs them. */
export type GoalTeams = {
  homeTeamId: string;
  /** Each team's colour as ESPN sends it: six hex digits without the `#`, or none. */
  homeColour?: string | null;
  awayColour?: string | null;
};

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

/** A team's colour over the ice: as it is on white ice, lifted where needed to show on slate. */
export type GoalTint = { light: string; dark: string };

/** What a goal plays besides its shot's line (`RinkAnimation`'s `goal` member). */
export type GoalSequence = {
  /** The side whose score is the one that changes. */
  side: "home" | "away";
  /** The scoring end's tint; null for a team ESPN sent no colour for, which gets the goal's red. */
  tint: GoalTint | null;
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

/*
 * The colour arithmetic is the approved prototype's own, kept to the digit so the tints match it
 * (`prototypes/tuned-ledger/app.js`). It is twenty lines; a colour package would put more than
 * that in every game page's chunk for the same two functions.
 */
const channels = (hex: string) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));

/** WCAG's relative luminance of a `#rrggbb` colour: 0 for black, 1 for white. */
export function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = channels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Below this a colour does not show as a tint over the dark theme's slate (Buffalo's navy). */
const SHOWS_ON_SLATE = 0.2;

/**
 * A team's colour as the tint over the scoring end, as the approved prototype has it: unchanged
 * on white ice, and in the dark theme lifted towards white until it stands off the page.
 */
export function goalTint(colour: string | null | undefined): GoalTint | null {
  if (colour == null || !/^#?[0-9a-f]{6}$/i.test(colour)) return null;
  const light = `#${colour.replace("#", "").toLowerCase()}`;
  let dark = light;
  for (let step = 0; step < 8 && luminance(dark) < SHOWS_ON_SLATE; step++) {
    dark = `#${channels(dark)
      .map((value) =>
        Math.round(value + (255 - value) * 0.18)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  }
  return { light, dark };
}

/** Above this a colour is light enough that black reads on it better than white (Nashville's gold). */
const TAKES_BLACK = 0.4;

/** A goal's flag in its caption: the team's colour, with whichever of black and white reads on it. */
export function goalFlag(colour: string | null | undefined) {
  const tint = goalTint(colour);
  if (tint == null) return undefined;
  return {
    backgroundColor: tint.light,
    color: luminance(tint.light) > TAKES_BLACK ? "#000" : "#fff",
  };
}

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
    tint: goalTint(side === "home" ? teams.homeColour : teams.awayColour),
    score: shootout || from < 0 || to <= from ? null : { from, to },
    scorer,
    strength,
    shootout,
  };
}
