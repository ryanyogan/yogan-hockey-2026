import type { Game, Play } from "@yogan-hockey/schemas";
import { type MarkKind, markKind, playTime } from "../../lib/game/plays";
import { layoutTimeline } from "../../lib/game/timeline";

/**
 * A tick: 4px by 16px for any play, 6px by 32px and red for a goal, and amber with a square
 * standing clear above it for a penalty. All stand on one line, 4px above the foot of the bar.
 */
const TICK = {
  play: "h-4 w-1 bg-slate-500 dark:bg-slate-400",
  goal: "z-20 h-8 w-1.5 bg-red-600 dark:bg-red-500",
  penalty:
    "z-10 h-4 w-1 bg-amber-500 before:absolute before:-top-2 before:left-1/2 before:size-1.5 before:-translate-x-1/2 before:bg-amber-500",
} as const;

const tickClass = (kind: MarkKind) =>
  kind === "goal" ? TICK.goal : kind === "penalty" ? TICK.penalty : TICK.play;

/**
 * The game along a line, a period at a time, with a tick for each play. Clicking a tick picks
 * that play.
 */
export function PeriodTimeline({
  game,
  plays,
  ticks = plays,
  upcoming = [],
  focusId,
  selectedId,
  onSelect,
}: {
  /** The game's period and season type decide which periods there are and how long overtime is. */
  game: Pick<Game, "period" | "seasonType">;
  /** Every play so far, which is what places a play (a shootout's go in order). */
  plays: readonly Play[];
  /** The plays to draw a tick for: the Key plays, or every play. All of `plays` if left out. */
  ticks?: readonly Play[];
  /** Ticks for plays a Replay has not reached: drawn faint, and clickable like the rest. */
  upcoming?: readonly Play[];
  /** The play in focus, whose tick is ringed: the picked play, or the latest. */
  focusId: string | null;
  /** The play the visitor picked, if any. */
  selectedId: string | null;
  onSelect: (playId: string) => void;
}) {
  const { periods, positions } = layoutTimeline(plays, game);
  return (
    <div data-slot="period-timeline" className="relative h-12 bg-secondary">
      {periods.map((period) => (
        <div
          key={period.period}
          data-slot="timeline-period"
          className={`absolute inset-y-0 border-rule ${period.start > 0 ? "border-l" : ""}`}
          style={{ left: `${period.start * 100}%`, width: `${period.width * 100}%` }}
        >
          <span className="absolute top-0.5 left-1 text-[10px] text-foreground/40">
            {period.label}
          </span>
        </div>
      ))}
      {[...ticks, ...upcoming].map((play, index) => {
        const kind = markKind(play);
        const ahead = index >= ticks.length;
        const focused = play.id === focusId;
        return (
          <button
            key={play.id}
            type="button"
            data-slot="timeline-tick"
            data-kind={kind}
            data-upcoming={ahead || undefined}
            aria-label={`${playTime(play)} ${play.text}`}
            aria-pressed={play.id === selectedId}
            title={play.text}
            onClick={() => onSelect(play.id)}
            className={`absolute bottom-1 -translate-x-1/2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${tickClass(
              kind,
            )} ${focused ? "z-30 ring-2 ring-foreground" : ""} ${ahead ? "opacity-30" : ""}`}
            style={{ left: `${(positions.get(play.id) ?? 0) * 100}%` }}
          />
        );
      })}
    </div>
  );
}
