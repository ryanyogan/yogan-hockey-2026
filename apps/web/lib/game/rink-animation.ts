import type { Play } from "@yogan-hockey/schemas";
import { RINK, type RinkEnd, type RinkPoint, rinkPoint } from "./rink";

/** A shot's line on the drawing, in the drawing's own feet. */
type ShotLine = {
  /** The play drawn, which is also its dot's `data-play`. */
  playId: string;
  /** The end whose net the shot was at. */
  end: RinkEnd;
  /** Where ESPN records the shot as taken. */
  from: RinkPoint;
  /** Where the line stops. */
  to: RinkPoint;
  /** Feet from `from` to the middle of the goal line: how long the puck is in flight. */
  distance: number;
};

/**
 * What the rink plays for one play: a description with no drawing in it, which `playRinkCue`
 * (`components/game/rink-player.ts`) turns into a GSAP timeline.
 *
 * One member per kind of thing seen. The goal sequence (#142) adds what a goal says besides its
 * line to the `goal` member.
 */
export type RinkAnimation =
  /** Into the net. */
  | ({ kind: "goal" } & ShotLine)
  /** Stopped at the edge of the crease. */
  | ({ kind: "save" } & ShotLine)
  /** Wide of the post, to the end boards. */
  | ({ kind: "miss" } & ShotLine)
  /**
   * The whistle, where ESPN records the infraction. No line: who sits and for how long is not a
   * moment but a state, which `penaltyState` (`./penalties.ts`) works out and the page draws.
   */
  | { kind: "penalty"; playId: string; at: RinkPoint };

/** The kinds that are a shot's line. */
type ShotKind = Extract<RinkAnimation, ShotLine>["kind"];

/** How far past the goal line a goal's line runs, into the net. */
const INTO_NET = 1.6;
/** A miss ends this far short of the end boards and this far from the middle of the net. */
const MISS = { short: 3, wide: 7 } as const;

/**
 * What to play on the rink for `play`, or null for a play the rink does not animate.
 *
 * Only what ESPN records is drawn: where the shot was taken, and how it ended. A play with no
 * coordinate is given no place. A blocked shot is recorded where the blocker stood, not the
 * shooter, so it has no line either.
 *
 * `attacks` is the end the play's team shoots at in its period (`attackedEnd`), which sends a
 * shot from a team's own half to the right net; without it the shot is at the nearer net.
 * `previous` is the play before this one in the game: nothing a shot's line needs, and what the
 * goal sequence (#142) reads the score before the goal from.
 */
export function describePlay(
  play: Play,
  _previous: Play | null,
  attacks: RinkEnd | null = null,
): RinkAnimation | null {
  if (play.coordinate == null) return null;
  if (play.penalty) return { kind: "penalty", playId: play.id, at: rinkPoint(play.coordinate) };
  const kind: ShotKind | null = play.scoring
    ? "goal"
    : play.type === "shot-on-goal"
      ? "save"
      : play.type === "shot-missed"
        ? "miss"
        : null;
  if (kind == null) return null;

  const from = rinkPoint(play.coordinate);
  const end: RinkEnd = attacks ?? (from.x >= 0 ? "right" : "left");
  const side = end === "right" ? 1 : -1;
  const distance = Math.hypot(from.x - side * RINK.goalLine, from.y);
  return { kind, playId: play.id, end, from, to: stopsAt(kind, from, side, distance), distance };
}

function stopsAt(kind: ShotKind, from: RinkPoint, side: 1 | -1, distance: number): RinkPoint {
  const netX = side * RINK.goalLine;
  switch (kind) {
    case "goal":
      return { x: netX + side * INTO_NET, y: 0 };
    case "save": {
      // Back along the shot's own line from the net, as far as the crease reaches.
      if (distance <= RINK.creaseRadius) return from;
      const reach = RINK.creaseRadius / distance;
      return { x: netX + (from.x - netX) * reach, y: from.y * reach };
    }
    case "miss":
      // Across the front of the net and wide of the far post.
      return { x: side * (RINK.halfLength - MISS.short), y: from.y >= 0 ? -MISS.wide : MISS.wide };
  }
}
