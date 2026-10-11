"use client";

import type { GameHeader, GameHeaderSide, Play } from "@yogan-hockey/schemas";
import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import { type ReactNode, useRef } from "react";
import { type GameClock, penaltyState } from "../../lib/game/penalties";
import { gameStatus, markKind, playTime } from "../../lib/game/plays";
import { attackedEnd, type RinkEnd } from "../../lib/game/rink";
import { periodLabel } from "../../lib/game/timeline";
import { LocalTime } from "../local-time";
import { TeamMark } from "../team-mark";
import { PenaltyBox, PenaltyBoxSpace, teamColour } from "./penalty-box";
import { Rink } from "./rink";
import { RinkAnimations } from "./rink-animations";

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

type Place = keyof typeof SCORE_SIDE;

/** One side's stack over the ice: a quiet line, a large figure, a second quiet line on a phone. */
function OverIce({
  slot,
  place,
  line,
  wide,
  figure,
  narrow,
}: {
  slot: string;
  place: Place;
  line: ReactNode;
  /** Joins `line` where the rink is wide enough to write one line. */
  wide: ReactNode;
  figure: ReactNode;
  /** What `wide` says, under the figure where the rink is narrow. */
  narrow: ReactNode;
}) {
  return (
    <div
      data-slot={slot}
      data-side={place}
      className={`absolute top-1 @2xl:top-[1.43cqw] ${SCORE_SIDE[place]}`}
    >
      <div className="whitespace-nowrap text-[10px] text-foreground/60 leading-[15px] @2xl:text-[clamp(10px,1.25cqw,14px)] @2xl:leading-[1.43]">
        {line}
        <span className="hidden @2xl:inline"> · {wide}</span>
      </div>
      <div className="font-bold text-2xl leading-none @2xl:text-[clamp(24px,5.36cqw,60px)]">
        {figure}
      </div>
      <div className="whitespace-nowrap text-[10px] text-foreground/60 leading-[15px] @2xl:hidden">
        {narrow}
      </div>
    </div>
  );
}

function Score({ side, place }: { side: GameHeaderSide; place: Place }) {
  return (
    <OverIce
      slot="rink-score"
      place={place}
      line={
        <>
          <TeamMark teamId={side.id} size="line" eager className="mr-[0.4em]" />
          {side.abbreviation}
        </>
      }
      wide={`${side.shots} shots`}
      figure={side.score}
      narrow={`${side.shots} sog`}
    />
  );
}

const STATUS_PLACE =
  "absolute top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-[10px] leading-[15px] @2xl:top-[1.43cqw] @2xl:text-[clamp(10px,1.43cqw,16px)] @2xl:leading-normal";
const STATUS_KICKER = "block uppercase @2xl:text-[clamp(10px,1.07cqw,12px)] @2xl:leading-[1.33]";
const CAPTION_ON_ICE = "max-w-[50cqw] truncate bg-black/70 px-4 py-1 text-slate-100 leading-5";
/* Under the ice where the ice is too small to write on. Two lines tall, so it never jumps. */
const CAPTION_UNDER_ICE =
  "mt-1 line-clamp-2 min-h-10 bg-secondary px-2 py-0.5 leading-[18px] @2xl:hidden";

/**
 * The rink before the game: the same ice at the same size as `GameRink`, so the page does not
 * move when the game starts, with the matchup where the score will be. Each team stands where
 * its score will and its record where its shots will; the start is over centre ice in the
 * visitor's own time, and the arena is the caption. `status` replaces the time of a game that is
 * called off.
 */
export function MatchupRink({ header, status }: { header: GameHeader; status?: string }) {
  const where = [header.venue, ...header.broadcasts].filter((part) => part != null).join(" · ");
  const team = (place: Place) => (
    <OverIce
      slot="rink-team"
      place={place}
      line={
        <>
          <TeamMark teamId={header[place].id} size="line" eager className="mr-[0.4em]" />
          {place}
        </>
      }
      wide={header[place].record ?? "no record"}
      figure={header[place].abbreviation}
      narrow={header[place].record ?? "no record"}
    />
  );
  return (
    <div data-slot="game-rink" className="@container">
      <div className="relative">
        <Rink plays={[]} focus={null} />
        <div data-slot="rink-overlay" className="pointer-events-none absolute inset-0">
          {team("away")}
          <div data-slot="rink-status" className={STATUS_PLACE}>
            <span className={`${STATUS_KICKER} text-foreground/60`}>
              <LocalTime at={header.startTime} show="day" />
            </span>
            {status ?? <LocalTime at={header.startTime} show="time" />}
          </div>
          {team("home")}
          {where !== "" && (
            <div className="absolute inset-x-0 bottom-[1.96cqw] hidden justify-center @2xl:flex">
              <p data-slot="rink-caption" className={CAPTION_ON_ICE}>
                {where}
              </p>
            </div>
          )}
        </div>
      </div>
      <PenaltyBoxSpace />
      <p data-slot="rink-caption" className={CAPTION_UNDER_ICE}>
        {where}
      </p>
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
 * the play in focus ringed and captioned. Shots, saves, misses and penalties are played on the
 * ice as they arrive, and when a play is picked (`RinkAnimations`). Under it is the penalty box,
 * and while a team has the advantage the zone it attacks is ruled in its colour.
 */
export function GameRink({
  header,
  plays,
  played = plays,
  drawn = plays,
  focus,
  picked = false,
  status,
  notice,
  clock = null,
}: {
  /** Its score, shots, period and clock are what is laid over the ice. */
  header: GameHeader;
  /** Every play known: which end each team shoots at is read from them. */
  plays: readonly Play[];
  /** The plays so far, where a Replay's playhead is short of the end. All of `plays` if left out. */
  played?: readonly Play[];
  /** The plays to put a dot on: the Key plays, or every play. All of `plays` if left out. */
  drawn?: readonly Play[];
  /** The play to ring and caption. */
  focus: Play | null;
  /** The focus was chosen, by a Replay's playhead or a click, and is not just the latest play. */
  picked?: boolean;
  /** Words to put over centre ice in place of the period and clock ("End of 2nd"). */
  status?: string;
  /** A warning under the clock: "Updates delayed". */
  notice?: string;
  /**
   * A live game's clock as last heard, which the penalties count down on between plays. Without
   * one they stand as of the latest play: a Replay's playhead.
   */
  clock?: GameClock | null;
}) {
  const { live, text } = gameStatus(header);
  // The ends are those of the period in focus, since the teams change ends each period.
  const period = focus?.period ?? Math.max(header.period, 1);
  const periodText = focus?.periodText || periodLabel(period, header.seasonType);
  const ends = { header, plays, period, periodText };
  const rink = useRef<SVGSVGElement>(null);

  // The box and the advantage are the game's as it stands (a Replay's at its playhead), not the
  // picked play's: like the score, they do not move when a tick is clicked.
  const penalties = penaltyState(
    played,
    { homeTeamId: header.home.id, awayTeamId: header.away.id, seasonType: header.seasonType },
    clock,
  );
  const ahead = [header.away, header.home].find((s) => s.id === penalties.advantage?.teamId);
  const now = clock?.period ?? played.at(-1)?.period ?? 1;
  const attacked = ahead && attackedEnd(plays, header.home.id, ahead.id, now);
  const powerPlay = ahead && attacked ? { end: attacked, style: teamColour(ahead) } : null;
  return (
    <div data-slot="game-rink" className="@container">
      <div className="relative">
        <Rink ref={rink} plays={drawn} focus={focus} powerPlay={powerPlay} />
        <RinkAnimations
          rink={rink}
          game={plays}
          plays={played}
          homeTeamId={header.home.id}
          focusId={focus?.id ?? null}
          picked={picked}
        />
        <div data-slot="rink-overlay" className="pointer-events-none absolute inset-0">
          <Score side={header.away} place="away" />
          <div data-slot="rink-status" className={STATUS_PLACE}>
            {live && <LiveMarker className={STATUS_KICKER} />}
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
              <p data-slot="rink-caption" className={CAPTION_ON_ICE} title={focus.text}>
                <Caption play={focus} />
              </p>
            </div>
          )}
        </div>
      </div>
      <PenaltyBox header={header} state={penalties} />
      <p data-slot="rink-caption" className={CAPTION_UNDER_ICE}>
        {focus != null && <Caption play={focus} />}
      </p>
    </div>
  );
}
