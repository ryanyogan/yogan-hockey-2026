import type { Game, Play } from "@yogan-hockey/schemas";
import { type MouseEvent, useRef } from "react";
import { type MarkKind, markKind, playTime } from "../../lib/game/plays";
import { layoutTimeline, nearestPlay } from "../../lib/game/timeline";

/**
 * A tick: 4px by 16px and grey for any play, 6px by 32px and the one red for a goal, and ink with
 * a square standing clear above it for a penalty. All stand on one line, 4px above the foot of the bar,
 * which is 56px tall: a goal's tick ends 2px under a period's label, where in a bar of 48px it ran
 * through "1ST".
 */
const TICK = {
  play: "h-4 w-1 bg-label",
  goal: "z-20 h-8 w-1.5 bg-kicker",
  penalty:
    "z-10 h-4 w-1 bg-foreground before:absolute before:-top-2 before:left-1/2 before:size-1.5 before:-translate-x-1/2 before:bg-foreground",
} as const;

const tickClass = (kind: MarkKind) =>
  kind === "goal" ? TICK.goal : kind === "penalty" ? TICK.penalty : TICK.play;

const LINE = "relative h-14 border border-rule";

const spoken = (play: Play) => `${playTime(play)} ${play.text}`;

/**
 * The game along a line, a period at a time, with a tick for each play. Clicking a tick picks
 * that play.
 *
 * The line is one control, not one to a tick: a game's ticks are 4 to 6px wide and closer than
 * that to each other (75 on a phone's 380px, some at the same minute), so no tick can be a
 * target of 24px, WCAG 2.2's least, whatever is laid over it. A click or a tap anywhere on the
 * line picks the play whose tick is nearest, and a click on a tick is still that tick's. To the
 * keyboard and to a screen reader the line is a slider over the plays drawn, which the arrow keys
 * step through and which speaks the play in focus: a range input that fills the line unseen, and
 * the line is its label, so the ticks are marks and say nothing themselves.
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
  const drawn = [...ticks, ...upcoming];
  const slider = useRef<HTMLInputElement>(null);
  const focus = drawn.findIndex((play) => play.id === focusId);

  const pick = (event: MouseEvent<HTMLLabelElement>) => {
    // A label hands its click on to its control, which would come back here as a second click.
    event.preventDefault();
    slider.current?.focus({ preventScroll: true });
    const line = event.currentTarget;
    const tick = (event.target as Element).closest<HTMLElement>('[data-slot="timeline-tick"]');
    const at =
      (event.clientX - line.getBoundingClientRect().left - line.clientLeft) / line.clientWidth;
    const id = tick?.dataset.play ?? nearestPlay(drawn, positions, at);
    if (id != null) onSelect(id);
  };

  const marks = (
    <>
      {periods.map((period) => (
        <div
          key={period.period}
          data-slot="timeline-period"
          className={`absolute inset-y-0 border-rule ${period.start > 0 ? "border-l" : ""}`}
          style={{ left: `${period.start * 100}%`, width: `${period.width * 100}%` }}
        >
          <span className="absolute top-1 left-1 font-bold text-head text-label uppercase tracking-head">
            {period.label}
          </span>
        </div>
      ))}
      {drawn.map((play, index) => {
        const kind = markKind(play);
        const ahead = index >= ticks.length;
        return (
          <span
            key={play.id}
            aria-hidden="true"
            data-slot="timeline-tick"
            data-kind={kind}
            data-upcoming={ahead || undefined}
            data-play={play.id}
            data-label={spoken(play)}
            data-picked={play.id === selectedId || undefined}
            title={play.text}
            className={`absolute bottom-1 -translate-x-1/2 outline-ring outline-offset-2 ${tickClass(
              kind,
            )} ${index === focus ? "z-30 outline-2 outline-foreground" : ""} ${ahead ? "opacity-30" : ""}`}
            style={{ left: `${(positions.get(play.id) ?? 0) * 100}%` }}
          />
        );
      })}
    </>
  );

  // A game not yet begun has a line and nothing on it to pick.
  if (drawn.length === 0) {
    return (
      <div data-slot="period-timeline" className={LINE}>
        {marks}
      </div>
    );
  }
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keys are the range input's, which this labels.
    <label
      data-slot="period-timeline"
      className={`${LINE} block cursor-pointer outline-ring outline-offset-2 has-[:focus-visible]:outline-2`}
      onClick={pick}
    >
      {marks}
      <input
        ref={slider}
        type="range"
        data-slot="timeline-slider"
        aria-label="Timeline"
        aria-valuetext={focus < 0 ? undefined : spoken(drawn[focus] as Play)}
        min={0}
        max={drawn.length - 1}
        step={1}
        value={Math.max(focus, 0)}
        onChange={(event) => {
          const play = drawn[Number(event.target.value)];
          if (play != null) onSelect(play.id);
        }}
        className="pointer-events-none absolute inset-0 m-0 size-full appearance-none opacity-0"
      />
    </label>
  );
}
