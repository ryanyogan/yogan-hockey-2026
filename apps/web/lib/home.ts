import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { agateName, headline, underWay } from "./agate-copy";

/** One club's row of a story's line score. */
export type LineScoreSide = {
  id: string;
  /** The name in agate type: "Seattle", "N.Y. Rangers". */
  name: string;
  /** "4-2-0", or null where ESPN sent none. */
  record: string | null;
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
 * The line score under a story's deck (`docs/design/agate.md`): team, record, and the score once
 * there is one. A game ESPN calls live from the warm-up has none yet, as its headline has none.
 */
export function lineScore(game: ScoreboardGame): LineScore {
  const final = game.status === "final";
  const played = final || underWay(game);
  const top = Math.max(game.away.score, game.home.score);
  const side = (each: ScoreboardGame["home"]): LineScoreSide => ({
    id: each.id,
    name: agateName(each),
    record: each.record,
    score: played ? each.score : null,
    winner: final && each.score === top,
  });
  return {
    caption: `${headline(game)}: line score`,
    score: final ? "F" : played ? "Now" : null,
    sides: [side(game.away), side(game.home)],
  };
}
