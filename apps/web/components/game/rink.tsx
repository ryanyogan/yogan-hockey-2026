import type { Play } from "@yogan-hockey/schemas";
import { type Ref, useId } from "react";
import { MARK_WORDS, type MarkKind, markKind, playTime } from "../../lib/game/plays";
import { RINK, type RinkEnd, rinkPoint } from "../../lib/game/rink";

const {
  halfLength,
  halfWidth,
  corner,
  blueLine,
  goalLine,
  circleX,
  circleY,
  circleRadius,
  creaseRadius,
  netDepth,
  netHalfWidth,
  lampRadius,
  margin,
} = RINK;

const VIEW_BOX = [
  -halfLength - margin,
  -halfWidth - margin,
  2 * (halfLength + margin),
  2 * (halfWidth + margin),
].join(" ");

/** The goal lines stop short of the boards, where the corners have begun to turn. */
const GOAL_LINE_REACH = 37;

/**
 * A play's dot, in the page's own inks (`docs/design/agate.md`: one red, and nothing else
 * coloured). A goal is the red; a save is ink and a shot grey; a penalty and a hit are rings,
 * ink and grey; anything else is the faintest grey. The kinds are told apart by weight and by
 * whether they are filled, since they cannot be by hue.
 */
const MARK_FILL: Record<MarkKind, string> = {
  goal: "fill-kicker",
  penalty: "fill-background stroke-foreground [stroke-width:0.6]",
  save: "fill-foreground",
  shot: "fill-label",
  hit: "fill-background stroke-label [stroke-width:0.5]",
  other: "fill-border",
};

/**
 * The colour of what an animation draws (`RinkAnimation`'s kinds), read from `data-kind` on the
 * layer it is drawn in: a goal's and a save's as their dots, a miss's as a shot's.
 */
const FX_STROKE = [
  "group-data-[kind=goal]/fx:stroke-kicker",
  "group-data-[kind=save]/fx:stroke-foreground",
  "group-data-[kind=miss]/fx:stroke-label",
  "group-data-[kind=penalty]/fx:stroke-foreground",
].join(" ");

/** Radii in feet: a goal is larger than any other play, and the play in focus larger again. */
const RADIUS = { focus: 5, goal: 3.2, play: 2 } as const;

function Mark({ play, focused }: { play: Play; focused: boolean }) {
  if (play.coordinate == null) return null;
  const { x, y } = rinkPoint(play.coordinate);
  const kind = markKind(play);
  return (
    <circle
      data-slot="rink-mark"
      data-play={play.id}
      data-kind={kind}
      data-focused={focused || undefined}
      cx={x}
      cy={y}
      r={focused ? RADIUS.focus : kind === "goal" ? RADIUS.goal : RADIUS.play}
      className={focused ? `stroke-foreground ${MARK_FILL[kind]}` : MARK_FILL[kind]}
      strokeWidth={focused ? 1 : 0}
    >
      <title>{`${playTime(play)} ${play.text}`}</title>
    </circle>
  );
}

/**
 * The key to the dots, under the ice: each kind drawn as `Mark` draws it, with its name. The
 * drawing says nothing to a screen reader, which is read the names alone.
 */
export function RinkKey() {
  return (
    <ul
      data-slot="rink-key"
      aria-label="What the dots on the rink are"
      className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label text-small"
    >
      {MARK_WORDS.map(([kind, word]) => (
        <li key={kind} className="flex items-center gap-1.5 whitespace-nowrap">
          <svg viewBox="-4 -4 8 8" aria-hidden="true" className="size-3 shrink-0">
            <circle r={kind === "goal" ? RADIUS.goal : RADIUS.play} className={MARK_FILL[kind]} />
          </svg>
          {word}
        </li>
      ))}
    </ul>
  );
}

/** A crease and the net behind it, which a shot's line is drawn to. `side` is -1 at the left end. */
function Goal({ side }: { side: 1 | -1 }) {
  const x = side * goalLine;
  return (
    <g data-slot="rink-goal" data-end={side > 0 ? "right" : "left"}>
      <path
        data-slot="rink-crease"
        d={`M ${x} ${-creaseRadius} A ${creaseRadius} ${creaseRadius} 0 0 ${side > 0 ? 0 : 1} ${x} ${creaseRadius}`}
        strokeWidth={0.4}
        className="fill-highlight stroke-foreground [stroke-opacity:0.6] data-lit:[stroke-opacity:1]"
      />
      <rect
        data-slot="rink-net"
        x={side > 0 ? x : x - netDepth}
        y={-netHalfWidth}
        width={netDepth}
        height={2 * netHalfWidth}
        fill="none"
        strokeWidth={0.5}
        className="stroke-aside data-lit:stroke-live data-lit:[stroke-width:1]"
      />
    </g>
  );
}

/**
 * The goal lamp on the boards behind a net, and the ring it throws when it comes on. Dark until a
 * goal's sequence lights it (`data-lit`, set by `rink-player.ts`), as the net is.
 */
function GoalLamp({ side }: { side: 1 | -1 }) {
  const end = side > 0 ? "right" : "left";
  return (
    <>
      <circle
        data-slot="rink-lamp-glow"
        data-end={end}
        cx={side * halfLength}
        cy={0}
        r={lampRadius}
        fill="none"
        opacity={0}
        className="stroke-live"
      />
      <circle
        data-slot="rink-lamp"
        data-end={end}
        cx={side * halfLength}
        cy={0}
        r={lampRadius}
        strokeWidth={0.4}
        className="fill-background stroke-aside data-lit:fill-live data-lit:stroke-live"
      />
    </>
  );
}

/**
 * An end zone, from its blue line to the boards, which a goal floods with the page's one red
 * whichever club scored (`docs/design/agate.md`). Drawn before `PowerPlayZones`, whose rules read
 * it.
 */
function EndTint({ side }: { side: 1 | -1 }) {
  const [line, boards, turn] = [side * blueLine, side * halfLength, side * (halfLength - corner)];
  const sweep = side > 0 ? 1 : 0;
  return (
    <path
      data-slot="rink-tint"
      data-end={side > 0 ? "right" : "left"}
      d={[
        `M ${line} ${-halfWidth} H ${turn}`,
        `A ${corner} ${corner} 0 0 ${sweep} ${boards} ${corner - halfWidth}`,
        `V ${halfWidth - corner}`,
        `A ${corner} ${corner} 0 0 ${sweep} ${turn} ${halfWidth} H ${line} Z`,
      ].join(" ")}
      opacity={0}
      className="fill-live"
    />
  );
}

/**
 * What an animation draws with (`rink-player.ts`): a shot's line, the puck on it, the bar and the
 * ring of a save. Drawn once, hidden, with nothing here that changes, so React never touches it
 * again and the player owns its attributes.
 */
function Effects() {
  return (
    <g data-slot="rink-fx" opacity={0} className="group/fx">
      <line data-fx="trail" x2={0} y2={0} strokeWidth={0.9} className={FX_STROKE} />
      <line data-fx="stop" strokeWidth={1.2} className={FX_STROKE} />
      <circle data-fx="pulse" cx={0} cy={0} r={1} fill="none" className={FX_STROKE} />
      <circle
        data-fx="puck"
        cx={0}
        cy={0}
        r={1.3}
        strokeWidth={0.4}
        className="fill-foreground stroke-background"
      />
    </g>
  );
}

/** The team with the advantage, and the end it attacks while it has it. */
export type RinkPowerPlay = { end: RinkEnd };

/** Ruled lines this far apart, in feet, at 45 degrees. */
const HATCH = 5;

/**
 * A goal's tint has an end to itself: while one is on (`data-lit` on that end's `EndTint`, set by
 * the player), the ruling of the same end stands aside, and comes back when the goal is cleared
 * if the advantage is still on (a major, or the second of two minors).
 */
const UNDER_A_GOAL = {
  left: "[[data-slot=rink-tint][data-end=left][data-lit]~g_&]:opacity-0",
  right: "[[data-slot=rink-tint][data-end=right][data-lit]~g_&]:opacity-0",
} as const;

/**
 * The power play on the ice: the zone the team with the advantage attacks, ruled in ink. A goal
 * floods an end and lets go; this stays for as long as the advantage does, so
 * it is lines and not a fill, and the dots stay readable through it.
 *
 * Both ends are always drawn and only their opacity changes, so the zone comes and goes without
 * the ice being redrawn, and at once for a visitor who asked for less motion.
 */
function PowerPlayZones({ powerPlay }: { powerPlay: RinkPowerPlay | null }) {
  const id = useId();
  const [hatch, boards] = [`${id}hatch`, `${id}boards`];
  return (
    <g data-slot="rink-power-play">
      <defs>
        <pattern
          id={hatch}
          width={HATCH}
          height={HATCH}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line y2={HATCH} strokeWidth={1.1} className="stroke-foreground" />
        </pattern>
        <clipPath id={boards}>
          <rect
            x={-halfLength}
            y={-halfWidth}
            width={2 * halfLength}
            height={2 * halfWidth}
            rx={corner}
          />
        </clipPath>
      </defs>
      {(["left", "right"] as const).map((end) => (
        <rect
          key={end}
          data-slot="rink-power-play-zone"
          data-end={end}
          data-on={powerPlay?.end === end || undefined}
          x={end === "left" ? -halfLength : blueLine}
          y={-halfWidth}
          width={halfLength - blueLine}
          height={2 * halfWidth}
          fill={`url(#${hatch})`}
          clipPath={`url(#${boards})`}
          className={`opacity-0 transition-opacity duration-500 data-on:opacity-45 motion-reduce:transition-none dark:data-on:opacity-60 ${UNDER_A_GOAL[end]}`}
        />
      ))}
    </g>
  );
}

/**
 * The ice, drawn in feet with centre ice at the origin, and a dot for each play that has a
 * coordinate. The play in focus is drawn last, larger and ringed, whether or not it is in `plays`.
 */
export function Rink({
  plays,
  focus = null,
  powerPlay = null,
  ref,
}: {
  /** The drawing itself, for whatever animates it. */
  ref?: Ref<SVGSVGElement>;
  /** The plays to draw, in the game's order. Those without a coordinate are skipped. */
  plays: readonly Play[];
  /** The play to highlight. */
  focus?: Play | null;
  /** The zone the team with the advantage attacks, which is ruled. */
  powerPlay?: RinkPowerPlay | null;
}) {
  // Goals over the rest, so a goal is never hidden under the shot before it.
  const others = plays.filter((play) => play.id !== focus?.id);
  const ordered = [...others.filter((p) => !p.scoring), ...others.filter((p) => p.scoring)];
  return (
    <svg
      ref={ref}
      data-slot="rink"
      viewBox={VIEW_BOX}
      role="img"
      aria-label="The rink, with a dot where each play happened"
      className="block w-full"
    >
      <rect
        x={-halfLength}
        y={-halfWidth}
        width={2 * halfLength}
        height={2 * halfWidth}
        rx={corner}
        strokeWidth={0.6}
        className="fill-background stroke-rule"
      />
      <EndTint side={-1} />
      <EndTint side={1} />
      <PowerPlayZones powerPlay={powerPlay} />
      <g fill="none" className="stroke-foreground">
        <line data-line="centre" y1={-halfWidth} y2={halfWidth} strokeOpacity={0.6} />
        {[-goalLine, goalLine].map((x) => (
          <line
            key={x}
            data-line="goal"
            x1={x}
            x2={x}
            y1={-GOAL_LINE_REACH}
            y2={GOAL_LINE_REACH}
            strokeOpacity={0.4}
            strokeWidth={0.5}
          />
        ))}
        {[-circleX, circleX].flatMap((x) =>
          [-circleY, circleY].map((y) => (
            <circle
              key={`${x},${y}`}
              data-circle="end"
              cx={x}
              cy={y}
              r={circleRadius}
              strokeOpacity={0.3}
            />
          )),
        )}
      </g>
      <g fill="none" className="stroke-foreground">
        {[-blueLine, blueLine].map((x) => (
          <line
            key={x}
            data-line="blue"
            x1={x}
            x2={x}
            y1={-halfWidth}
            y2={halfWidth}
            strokeOpacity={0.6}
            strokeWidth={1.2}
          />
        ))}
        <circle data-circle="centre" r={circleRadius} strokeOpacity={0.4} />
      </g>
      <Goal side={-1} />
      <Goal side={1} />
      {ordered.map((play) => (
        <Mark key={play.id} play={play} focused={false} />
      ))}
      {/* Keyed, so each focus is a dot of its own: an animation may be part-way through the last. */}
      {focus != null && <Mark key={focus.id} play={focus} focused />}
      {/* Over the dots: a play against the end boards must not hide the lamp. */}
      <GoalLamp side={-1} />
      <GoalLamp side={1} />
      <Effects />
    </svg>
  );
}
