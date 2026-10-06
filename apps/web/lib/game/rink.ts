import type { Play, PlayCoordinate } from "@yogan-hockey/schemas";

/**
 * The rink as drawn, in feet with centre ice at the origin: an NHL sheet is 200 by 85. The
 * drawing's units are feet, so a play's place on it is its ESPN coordinate with y turned over.
 */
export const RINK = {
  halfLength: 100,
  halfWidth: 42.5,
  /** The corners' radius. */
  corner: 28,
  /** The blue lines and the goal lines, as distances from centre ice. */
  blueLine: 25,
  goalLine: 89,
  /** The end-zone faceoff circles' centres, and every circle's radius. */
  circleX: 69,
  circleY: 22,
  circleRadius: 15,
  /** Room left round the boards for their stroke. */
  margin: 2,
} as const;

export type RinkPoint = { x: number; y: number };

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/**
 * Where a play goes on the drawing.
 *
 * ESPN's coordinates are fixed to the building, not to the team: in 14 finished games each team's
 * shots fall at one end in the 1st, the other in the 2nd, and so on. So nothing is mirrored by
 * period. x is drawn as given; y is positive up the drawing, as a shot chart has it, where the
 * drawing's own y runs down.
 */
export function rinkPoint(coordinate: PlayCoordinate): RinkPoint {
  return {
    x: clamp(coordinate.x, RINK.halfLength),
    // `0 - y`, so centre ice is 0 and never -0.
    y: clamp(0 - coordinate.y, RINK.halfWidth),
  };
}

export type RinkEnd = "left" | "right";

/** Where ESPN records the shooter. A blocked shot is recorded where the blocker stood. */
const SHOT_TYPES = new Set(["goal", "shot-on-goal", "shot-missed"]);

/** A period's own shots decide its ends only when they lean at least this far one way. */
const CLEAR_MARGIN = 3;

const otherEnd = (end: RinkEnd): RinkEnd => (end === "left" ? "right" : "left");

/**
 * How far the home team's shots lean right in each period: +1 for a home shot from the right half
 * or an away shot from the left, -1 for the reverse.
 */
function homeLeanByPeriod(plays: readonly Play[], homeTeamId: string): Map<number, number> {
  const lean = new Map<number, number>();
  for (const play of plays) {
    if (!SHOT_TYPES.has(play.type) || play.teamId == null || play.coordinate == null) continue;
    const side = Math.sign(play.coordinate.x) * (play.teamId === homeTeamId ? 1 : -1);
    lean.set(play.period, (lean.get(play.period) ?? 0) + side);
  }
  return lean;
}

/**
 * The end of the drawing a team shoots at in a period, or null before the game has a shot to
 * tell by.
 *
 * Which end the home team starts at differs from game to game (right in 9 of 14, left in 5), so
 * it is read from where the shots fell. Teams change ends every period, overtime and the
 * shootout included: a period with too few shots of its own to be sure takes the end the rest of
 * the game gives it.
 */
export function attackedEnd(
  plays: readonly Play[],
  homeTeamId: string,
  teamId: string,
  period: number,
): RinkEnd | null {
  const lean = homeLeanByPeriod(plays, homeTeamId);
  let homeLean = lean.get(period) ?? 0;
  if (Math.abs(homeLean) < CLEAR_MARGIN) {
    // Every period's shots, each counted as if it were this period: one of the other parity has
    // the teams at the other ends.
    homeLean = 0;
    for (const [other, value] of lean) homeLean += (other - period) % 2 === 0 ? value : -value;
  }
  if (homeLean === 0) return null;
  const homeEnd: RinkEnd = homeLean > 0 ? "right" : "left";
  return teamId === homeTeamId ? homeEnd : otherEnd(homeEnd);
}
