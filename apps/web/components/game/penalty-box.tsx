import type { GameHeader, GameHeaderSide } from "@yogan-hockey/schemas";
import {
  type BoxedPenalty,
  clockText,
  type PenaltyState,
  strengthLine,
} from "../../lib/game/penalties";
import { TEAM_BG, teamColour } from "./team-colour";

/*
 * The box's size is the same whoever is in it: a heading and two rows, so a penalty arriving or
 * running out moves nothing on the page. Where the rink is wide the teams sit side by side with
 * two rows each. A third penalty at once (a third for one team on a wide rink) adds a row: every
 * penalty is shown, and that is rarer than a box that is always three rows of nothing.
 */
const ROW = "flex h-6 items-center gap-2 px-2";
const ROWS = "min-h-12";
const FRAME = "mt-1 border border-border text-xs leading-6 @2xl:text-sm";

/** What a penalty is besides a minor served at once: said quietly after the infraction. */
function note({ kind, minutes, infraction, waiting, shortHanded }: BoxedPenalty): string {
  const length = {
    minor: null,
    "double-minor": "double minor",
    major: "major",
    misconduct: /misconduct/i.test(infraction) ? `${minutes} min` : `${minutes} min misconduct`,
  }[kind];
  return [
    waiting ? "to follow" : null,
    length,
    !shortHanded && kind !== "misconduct" ? "coincidental" : null,
  ]
    .filter((part) => part != null)
    .join(" · ");
}

function Boxed({ penalty, side }: { penalty: BoxedPenalty; side: GameHeaderSide }) {
  const more = note(penalty);
  return (
    <li
      data-slot="boxed-penalty"
      data-play={penalty.playId}
      data-waiting={penalty.waiting || undefined}
      className={`${ROW} motion-safe:animate-[boxed-in_300ms_ease-out]`}
      style={teamColour(side)}
    >
      <span aria-hidden="true" className={`h-3.5 w-[3px] shrink-0 ${TEAM_BG}`} />
      <span className="w-[3ch] shrink-0">{side.abbreviation}</span>
      <span className="shrink-0">{penalty.player ?? "Bench"}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {penalty.infraction}
        {more !== "" && ` · ${more}`}
      </span>
      <span
        data-slot="penalty-clock"
        className={`shrink-0 font-bold tabular-nums ${penalty.waiting ? "text-muted-foreground" : ""}`}
      >
        <span className="sr-only">time left </span>
        {clockText(penalty.remaining)}
      </span>
    </li>
  );
}

/**
 * Who is in the penalty box, with the time each has left on the game clock, and who has the
 * advantage. It is drawn from the state alone, so a Replay's step and a Game Stream's poll show
 * it the same way, and nothing here moves on its own: the clocks are the game's, as last heard.
 */
export function PenaltyBox({ header, state }: { header: GameHeader; state: PenaltyState }) {
  const sides = [header.away, header.home];
  const { skaters, advantage } = state;
  const ahead = sides.find((side) => side.id === advantage?.teamId);
  const even = skaters.home === skaters.away;
  return (
    <section data-slot="penalty-box" aria-label="Penalty box" className={FRAME}>
      <div className={`${ROW} justify-between border-border border-b`}>
        <p className="text-muted-foreground uppercase">Penalty box</p>
        {ahead != null && advantage != null ? (
          <p data-slot="power-play" className="flex items-center gap-2" style={teamColour(ahead)}>
            <span aria-hidden="true" className={`size-2 shrink-0 ${TEAM_BG}`} />
            <span>
              <span className="font-bold">{ahead.abbreviation} power play</span>
              <span className="text-muted-foreground"> · {strengthLine(skaters)} · </span>
              <span className="font-bold tabular-nums">{clockText(advantage.remaining)}</span>
            </span>
          </p>
        ) : (
          // Four on four, or overtime's three on three: no advantage, and still worth saying.
          even &&
          skaters.home !== 5 && (
            <p data-slot="strength" className="text-muted-foreground">
              {strengthLine(skaters)}
            </p>
          )
        )}
      </div>
      <div className={`relative grid grid-cols-1 @2xl:grid-cols-2 ${ROWS}`}>
        {state.box.length === 0 && (
          <p
            data-slot="penalty-box-empty"
            className={`${ROW} absolute inset-x-0 top-0 text-muted-foreground`}
          >
            Nobody in the box
          </p>
        )}
        {sides.map((side, index) => (
          <ul
            key={side.id}
            data-side={index === 0 ? "away" : "home"}
            aria-label={`${side.abbreviation} penalties`}
            className={`min-w-0 ${index === 1 ? "@2xl:border-border @2xl:border-l" : ""}`}
          >
            {state.box
              .filter((penalty) => penalty.teamId === side.id)
              .map((penalty) => (
                <Boxed key={penalty.playId} penalty={penalty} side={side} />
              ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

/** The room the box takes, with nothing in it: under a rink that has no game on it yet. */
export function PenaltyBoxSpace() {
  return (
    <div data-slot="penalty-box-space" aria-hidden="true" className={`${FRAME} border-transparent`}>
      <div className="h-6 border-transparent border-b" />
      <div className={ROWS} />
    </div>
  );
}
