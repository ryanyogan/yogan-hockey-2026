import type { ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";
import { agateName, headline, underWay } from "./agate-copy";

/*
 * A story's table (`docs/design/agate.md`: kicker, headline, deck, line score). The sentences are
 * `agate-copy.ts`'s; this is the one line score, which a lead on Home and a game page's header
 * both draw (`components/story/story-parts.tsx`).
 */

/**
 * A game as a story reads it: the Scoreboard's, and each side's shots where the page has them. A
 * game page's `GameHeader` is one, so it is handed over as it is.
 */
export type StoryGame = Omit<ScoreboardGame, "home" | "away"> & {
  home: ScoreboardSide & { shots?: number };
  away: ScoreboardSide & { shots?: number };
};

/** One club's row of a story's line score. */
export type LineScoreSide = {
  id: string;
  /** The name in agate type: "Seattle", "N.Y. Rangers". */
  name: string;
  /** "4-2-0", or null where ESPN sent none. */
  record: string | null;
  /** Shots on goal, once there is a score and the page knows them: Home's Scoreboard does not. */
  shots: number | null;
  /** Null for a game with no score to show yet. */
  score: number | null;
  /** The side a final went to, which is drawn bold. Nobody's while a game is on. */
  winner: boolean;
};

/** A story's line score: the away side over the home side. */
export type LineScore = {
  /** What the table is, for a reader who cannot see the headline above it. */
  caption: string;
  /** The score column's head: "F" for a final, "Now" for a game under way, null for no column. */
  score: "F" | "Now" | null;
  sides: [away: LineScoreSide, home: LineScoreSide];
};

/**
 * The line score under a story's deck: team, record, and once there is a score the shots (where
 * known) and the score. A game ESPN calls live from the warm-up has none yet, as its headline has
 * none.
 */
export function lineScore(game: StoryGame): LineScore {
  const final = game.status === "final";
  const played = final || underWay(game);
  const top = Math.max(game.away.score, game.home.score);
  const side = (each: StoryGame["home"]): LineScoreSide => ({
    id: each.id,
    name: agateName(each),
    record: each.record,
    shots: played ? (each.shots ?? null) : null,
    score: played ? each.score : null,
    winner: final && each.score === top,
  });
  return {
    caption: `${headline(game)}: line score`,
    score: final ? "F" : played ? "Now" : null,
    sides: [side(game.away), side(game.home)],
  };
}
