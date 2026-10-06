import type { Play } from "@yogan-hockey/schemas";
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

/**
 * The ice, drawn in feet with centre ice at the origin, and a dot for each play that has a
 * coordinate. The play in focus is drawn last, larger and ringed, whether or not it is in `plays`.
 */
export function Rink({
  plays,
  focus = null,
}: {
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
      {ordered.map((play) => (
        <Mark key={play.id} play={play} focused={false} />
      ))}
      {focus != null && <Mark play={focus} focused />}
    </svg>
  );
}
