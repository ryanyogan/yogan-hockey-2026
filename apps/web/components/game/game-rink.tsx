import type { GameHeader, GameHeaderSide, Play } from "@yogan-hockey/schemas";
import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import { gameStatus, markKind, playTime } from "../../lib/game/plays";
import { attackedEnd, type RinkEnd } from "../../lib/game/rink";
import { periodLabel } from "../../lib/game/timeline";
import { Rink } from "./rink";

/*
 * Where the overlay sits, as fractions of the rink's width (`cqw`), so it keeps its place at any
 * size. The Reference UI draws the rink 1120px wide, and every size here is its size there,
 * capped at that.
 *
 * The scores stand in the strip between an end-zone faceoff circle (which ends 23.5% in) and the
 * blue line (37.7% in), and the clock over centre ice above the centre circle, so no circle is
 * written over. Below `@2xl` (a rink 672px wide: a phone, or a narrow column beside the sidebar)
 * a one-line "BUF · 24 shots" no longer fits that strip, so each side becomes a centred stack,
 * and the caption, too long for the ice, moves under the rink.
 */
const SCORE_SIDE = {
  away: "left-[30.6cqw] -translate-x-1/2 text-center @2xl:left-[24.5cqw] @2xl:translate-x-0 @2xl:text-left",
  home: "right-[30.6cqw] translate-x-1/2 text-center @2xl:right-[24.5cqw] @2xl:translate-x-0 @2xl:text-right",
} as const;

function Score({ side, place }: { side: GameHeaderSide; place: keyof typeof SCORE_SIDE }) {
  return (
    <div
      data-slot="rink-score"
      data-side={place}
      className={`absolute top-1 @2xl:top-[1.43cqw] ${SCORE_SIDE[place]}`}
    >
      <div className="whitespace-nowrap text-[10px] text-foreground/60 leading-[15px] @2xl:text-[clamp(10px,1.25cqw,14px)] @2xl:leading-[1.43]">
        {side.abbreviation}
        <span className="hidden @2xl:inline"> · {side.shots} shots</span>
      </div>
      <div className="font-bold text-2xl leading-none @2xl:text-[clamp(24px,5.36cqw,60px)]">
        {side.score}
      </div>
      <div className="whitespace-nowrap text-[10px] text-foreground/60 leading-[15px] @2xl:hidden">
        {side.shots} sog
      </div>
    </div>
  );
}

/** The team shooting at an end, written up the ice behind that end's goal line. */
function EndLabel({ end, header, plays, period, periodText }: EndProps & { end: RinkEnd }) {
  const side = [header.away, header.home].find(
    (team) => attackedEnd(plays, header.home.id, team.id, period) === end,
  );
  if (side == null) return null;
  return (
    <div
      data-slot="rink-end"
      data-end={end}
      className={`absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap text-[10px] text-foreground/60 [writing-mode:vertical-rl] @2xl:block ${
        end === "left"
          ? "left-[3.7cqw] -translate-x-1/2 rotate-180"
          : "right-[3.7cqw] translate-x-1/2"
      }`}
    >
      {side.abbreviation} shoots this way · {periodText}
    </div>
  );
}
type EndProps = { header: GameHeader; plays: readonly Play[]; period: number; periodText: string };

function Caption({ play }: { play: Play }) {
  return (
    <>
      {markKind(play) === "goal" && "GOAL · "}
      {play.text} <span className="opacity-60">{playTime(play)}</span>
    </>
  );
}

/**
 * The rink as the page: the ice filling the width, the score, shots and clock laid over it, and
 * the play in focus ringed and captioned.
 */
export function GameRink({
  header,
  plays,
  drawn = plays,
  focus,
  status,
  notice,
}: {
  /** Its score, shots, period and clock are what is laid over the ice. */
  header: GameHeader;
  /** Every play so far: which end each team shoots at is read from them. */
  plays: readonly Play[];
  /** The plays to put a dot on: the Key plays, or every play. All of `plays` if left out. */
  drawn?: readonly Play[];
  /** The play to ring and caption. */
  focus: Play | null;
  /** Words to put over centre ice in place of the period and clock ("End of 2nd"). */
  status?: string;
  /** A warning under the clock: "Updates delayed". */
  notice?: string;
}) {
  const { live, text } = gameStatus(header);
  // The ends are those of the period in focus, since the teams change ends each period.
  const period = focus?.period ?? Math.max(header.period, 1);
  const periodText = focus?.periodText || periodLabel(period, header.seasonType);
  const ends = { header, plays, period, periodText };
  return (
    <div data-slot="game-rink" className="@container">
      <div className="relative">
        <Rink plays={drawn} focus={focus} />
        <div data-slot="rink-overlay" className="pointer-events-none absolute inset-0">
          <Score side={header.away} place="away" />
          <div
            data-slot="rink-status"
            className="absolute top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-[10px] leading-[15px] @2xl:top-[1.43cqw] @2xl:text-[clamp(10px,1.43cqw,16px)] @2xl:leading-normal"
          >
            {live && (
              <LiveMarker className="block uppercase @2xl:text-[clamp(10px,1.07cqw,12px)] @2xl:leading-[1.33]" />
            )}
            {status ?? text}
            {notice != null && (
              <span data-slot="rink-notice" className="block text-[10px] text-live leading-[15px]">
                {notice}
              </span>
            )}
          </div>
          <Score side={header.home} place="home" />
          <EndLabel end="left" {...ends} />
          <EndLabel end="right" {...ends} />
          {focus != null && (
            <div className="absolute inset-x-0 bottom-[1.96cqw] hidden justify-center @2xl:flex">
              <p
                data-slot="rink-caption"
                className="max-w-[50cqw] truncate bg-black/70 px-4 py-1 text-slate-100 leading-5"
                title={focus.text}
              >
                <Caption play={focus} />
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Under the ice where the ice is too small to write on. Two lines tall, so it never jumps. */}
      <p
        data-slot="rink-caption"
        className="mt-1 line-clamp-2 min-h-10 bg-secondary px-2 py-0.5 leading-[18px] @2xl:hidden"
      >
        {focus != null && <Caption play={focus} />}
      </p>
    </div>
  );
}
