import type { ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";
import { agateName, headline, kicker, rec, statusText } from "../agate-copy";
import { gameTime, NHL_TIME_ZONE } from "../game-time";

/*
 * The game page's header as a story (`docs/design/agate.md`: kicker, headline, deck, line score).
 * The sentences are `lib/agate-copy.ts`'s, which reads a game of the Scoreboard; a game page's
 * `GameHeader` is one with more on it, so it is handed over as it is. This file adds the table.
 */

/** A game as a story reads it: the Scoreboard's, and each side's shots where the page has them. */
export type StoryGame = Omit<ScoreboardGame, "home" | "away"> & {
  home: ScoreboardSide & { shots?: number };
  away: ScoreboardSide & { shots?: number };
};

export type LineScoreSide = {
  id: string;
  /** The name in agate type: "Seattle", "N.Y. Rangers". */
  name: string;
  /** The record, which never breaks across lines. Null where ESPN sent none. */
  record: string | null;
  /** Shots on goal, once there is a score and the page knows them. */
  shots: number | null;
  /** Null until the puck drops. */
  score: number | null;
  /** The winner of a final, which is set bold. */
  winner: boolean;
};

export type LineScore = {
  /** The table's caption, which names the game. */
  caption: string;
  /** What the score's column is headed: "F" for a final, "Now" under way, null with no score. */
  score: "F" | "Now" | null;
  /** The visitors, then the home side. */
  sides: [away: LineScoreSide, home: LineScoreSide];
};

/** The story's table: team, record and, once the puck has dropped, shots and the score. */
export function gameLineScore(game: StoryGame): LineScore {
  const played = game.status === "final" || (game.status === "live" && game.period > 0);
  const best = Math.max(game.away.score, game.home.score);
  const side = (team: StoryGame["home"]): LineScoreSide => ({
    id: team.id,
    name: agateName(team),
    record: team.record == null ? null : rec(team.record),
    shots: played ? (team.shots ?? null) : null,
    score: played ? team.score : null,
    winner: game.status === "final" && team.score === best,
  });
  return {
    caption: `${headline(game)}: line score`,
    score: !played ? null : game.status === "final" ? "F" : "Now",
    sides: [side(game.away), side(game.home)],
  };
}

/**
 * The kicker as the server writes it, which knows only the NHL's zone: a start time is marked
 * ("7:00 PM ET · Scotiabank Arena"), as `LocalTime` marks one. The browser writes `kicker(game)`,
 * in the visitor's own zone, once the page has hydrated.
 */
export function easternKicker(game: StoryGame): string {
  const line = kicker(game, NHL_TIME_ZONE);
  const time = gameTime(game.startTime, NHL_TIME_ZONE);
  // Only a status that is the start time has one: "Final", "Live · 3rd 18:44" and "Postponed" do not.
  return statusText(game, NHL_TIME_ZONE) === time ? line.replace(time, `${time} ET`) : line;
}
