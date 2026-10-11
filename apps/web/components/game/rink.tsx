import type { Play } from "@yogan-hockey/schemas";
import type { Ref } from "react";
import { type MarkKind, markKind, playTime } from "../../lib/game/plays";
import { RINK, rinkPoint } from "../../lib/game/rink";

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

/** A play's dot. On white ice each colour is a step darker than on dark ice. */
const MARK_FILL: Record<MarkKind, string> = {
  goal: "fill-red-600 dark:fill-red-500",
  penalty: "fill-amber-500",
  save: "fill-sky-500 dark:fill-sky-400",
  shot: "fill-slate-500 dark:fill-slate-400",
  hit: "fill-violet-500 dark:fill-violet-400",
  other: "fill-slate-400 dark:fill-slate-500",
};

/**
 * The colour of what an animation draws (`RinkAnimation`'s kinds), read from `data-kind` on the
 * layer it is drawn in: a goal's and a save's as their dots, a miss's as a shot's.
 */
const FX_STROKE = [
  "group-data-[kind=goal]/fx:stroke-red-600 dark:group-data-[kind=goal]/fx:stroke-red-500",
  "group-data-[kind=save]/fx:stroke-sky-500 dark:group-data-[kind=save]/fx:stroke-sky-400",
  "group-data-[kind=miss]/fx:stroke-slate-500 dark:group-data-[kind=miss]/fx:stroke-slate-400",
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
      className={focused ? `${MARK_FILL[kind]} stroke-foreground` : MARK_FILL[kind]}
      strokeWidth={focused ? 1 : 0}
    >
      <title>{`${playTime(play)} ${play.text}`}</title>
    </circle>
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
        className="fill-sky-400/20 stroke-red-600/60 data-lit:stroke-sky-500 dark:fill-sky-400/15 dark:stroke-red-500/60 dark:data-lit:stroke-sky-400"
      />
      <rect
        data-slot="rink-net"
        x={side > 0 ? x : x - netDepth}
        y={-netHalfWidth}
        width={netDepth}
        height={2 * netHalfWidth}
        fill="none"
        strokeWidth={0.5}
        className="stroke-foreground/50 data-lit:stroke-live data-lit:[stroke-width:1]"
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
        className="fill-background stroke-foreground/50 data-lit:fill-live data-lit:stroke-live"
      />
    </>
  );
}

/**
 * An end zone, from its blue line to the boards, which a goal floods with the scoring team's
 * colour. The player gives it the colour as `--tint` and `--tint-dark`, so the theme picks; a
 * team with no colour gets the goal's red.
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
      className="[fill:var(--tint,var(--live))] dark:[fill:var(--tint-dark,var(--live))]"
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

/**
 * The ice, drawn in feet with centre ice at the origin, and a dot for each play that has a
 * coordinate. The play in focus is drawn last, larger and ringed, whether or not it is in `plays`.
 */
export function Rink({
  plays,
  focus = null,
  ref,
}: {
  /** The drawing itself, for whatever animates it. */
  ref?: Ref<SVGSVGElement>;
  /** The plays to draw, in the game's order. Those without a coordinate are skipped. */
  plays: readonly Play[];
  /** The play to highlight. */
  focus?: Play | null;
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
        className="fill-white stroke-sky-900/35 dark:fill-sky-200/[0.04] dark:stroke-sky-200/35"
      />
      <EndTint side={-1} />
      <EndTint side={1} />
      <g fill="none" className="stroke-red-600 dark:stroke-red-500">
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
      <g fill="none" className="stroke-blue-600 dark:stroke-blue-500">
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
