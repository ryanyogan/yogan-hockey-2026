import { type GameHeader, isKeyPlay, type Play } from "@yogan-hockey/schemas";
import { periodLabel, SHOOTOUT } from "./timeline";

/** The plays a game page lists and draws: the Key plays, or every play on request. */
export function visiblePlays(plays: readonly Play[], everyPlay: boolean): Play[] {
  return everyPlay ? [...plays] : plays.filter(isKeyPlay);
}

/**
 * The play the rink highlights and captions: the selected one while the game still has it,
 * otherwise the latest, which is how a page follows a game.
 */
export function focusedPlay(plays: readonly Play[], selectedId: string | null): Play | null {
  const selected = selectedId == null ? undefined : plays.find((play) => play.id === selectedId);
  return selected ?? plays.at(-1) ?? null;
}

/** Clicking a play selects it; clicking the selected play goes back to following the game. */
export function toggleSelection(selectedId: string | null, clickedId: string): string | null {
  return selectedId === clickedId ? null : clickedId;
}

/**
 * How a play is marked on the rink and the timeline. "save" is a shot on goal that was stopped;
 * "shot" one that missed or was blocked.
 */
export type MarkKind = "goal" | "penalty" | "save" | "shot" | "hit" | "other";

export function markKind(play: Play): MarkKind {
  if (play.scoring) return "goal";
  if (play.penalty) return "penalty";
  if (play.type === "shot-on-goal") return "save";
  if (play.type === "shot-missed" || play.type === "shot-blocked") return "shot";
  if (play.type === "hit") return "hit";
  return "other";
}

/**
 * The goals for a scoring summary. A shootout goal is a goal to ESPN and moves no score, so the
 * shootout's are listed apart, without one.
 */
export function scoringPlays(plays: readonly Play[]): { goals: Play[]; shootout: Play[] } {
  const scored = plays.filter((play) => play.scoring);
  return {
    goals: scored.filter((play) => play.periodText !== SHOOTOUT),
    shootout: scored.filter((play) => play.periodText === SHOOTOUT),
  };
}

/** "2nd 4:24". A shootout attempt has no clock, so it is "SO". */
export function playTime(play: Play): string {
  return play.periodText === SHOOTOUT ? SHOOTOUT : `${play.periodText} ${play.clock}`;
}

/** The abbreviation of the team a play belongs to; "" for a play that belongs to neither. */
export function teamAbbreviation(header: GameHeader, teamId: string | null): string {
  if (teamId === header.home.id) return header.home.abbreviation;
  if (teamId === header.away.id) return header.away.abbreviation;
  return "";
}

/**
 * The words over centre ice. A live game says its period and the time left in it; any other says
 * what ESPN says ("Final/SO", "10/6 - 7:00 PM EDT").
 */
export function gameStatus(header: GameHeader): { live: boolean; text: string } {
  if (header.status !== "live") return { live: false, text: header.detail };
  const period = periodLabel(header.period, header.seasonType);
  return { live: true, text: period === SHOOTOUT ? period : `${period} ${header.clock}` };
}
