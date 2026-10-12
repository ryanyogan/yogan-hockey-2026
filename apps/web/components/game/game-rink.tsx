"use client";

import type { GameHeader, GameHeaderSide, Play } from "@yogan-hockey/schemas";
import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import { type ReactNode, useRef, useState } from "react";
import { shotsOnGoal } from "../../lib/agate-copy";
import { goalCall, STRENGTH_WORDS } from "../../lib/game/goal";
import { type GameClock, NO_PENALTIES, penaltyState } from "../../lib/game/penalties";
import { gameStatus, markKind, playTime } from "../../lib/game/plays";
import { attackedEnd, type RinkEnd } from "../../lib/game/rink";
import { periodLabel } from "../../lib/game/timeline";
import { LocalTime } from "../local-time";
import { PenaltyBox, PenaltyBoxSpace } from "./penalty-box";
import { Rink } from "./rink";
import { RinkAnimations } from "./rink-animations";

/*
 * Where the overlay sits, as fractions of the rink's width (`cqw`), so it keeps its place at any
 * size. The Reference UI draws the rink 1120px wide, and every size here is its size there,
 * capped at that.
 *
 * The scores stand in the strip between an end-zone faceoff circle (which ends 23.5% in) and the
 * blue line (37.7% in), and the clock over centre ice above the centre circle, so no circle is
 * written over. Below `@2xl` (a rink 672px wide: a phone, or a narrow window)
 * a one-line "BUF · 24 shots" no longer fits that strip, so each side becomes a centred stack,
 * and the caption, too long for the ice, moves under the rink.
 *
 * The type is the page's two voices: the figures are the serif's, as a big number is, and every
 * word beside them is agate. A caption on the ice is a slip of paper with a plain ink rule round
 * it; under the ice it is a line over a hairline. Nothing here is filled but the goal's red flag.
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
  word = false,
  wide,
  figure,
  narrow,
}: {
  slot: string;
  place: Place;
  line: ReactNode;
  /**
   * The figure is a club's abbreviation, not a score. Three serif capitals at a score's 24px are
   * as wide as the strip they stand in on a phone (51px of a 358px rink) and touched the blue
   * line, so there they are 18px on the same 24px line.
   */
  word?: boolean;
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
      <div className="whitespace-nowrap text-small text-note leading-[15px] @2xl:text-[clamp(10px,1.25cqw,14px)] @2xl:leading-[1.43]">
        {line}
        <span className="hidden @2xl:inline"> · {wide}</span>
      </div>
      <div
        className={`font-bold font-serif @2xl:text-[clamp(24px,5.36cqw,60px)] @2xl:leading-none ${
          word ? "text-[18px] leading-6" : "text-2xl leading-none"
        }`}
      >
        {figure}
      </div>
      <div className="whitespace-nowrap text-small text-note leading-[15px] @2xl:hidden">
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
      line={side.abbreviation}
      wide={shotsOnGoal(side.shots)}
      figure={
        // A window one figure tall. A goal's sequence (`rink-player.ts`) writes the score before
        // the goal above the figure and rolls the two up through the window; the figure itself is
        // always the header's, so the roll can only end on the right score.
        <span className="block h-[1em] overflow-hidden">
          <span data-fx="score-roll" data-side={place} className="relative block">
            <span
              data-fx="score-before"
              aria-hidden="true"
              className="absolute inset-x-0 bottom-full block h-[1em] before:content-[attr(data-from)]"
            />
            {side.score}
          </span>
        </span>
      }
      narrow={`${side.shots} sog`}
    />
  );
}

/* On a slip of paper, as a caption is: the centre line runs under the clock, not through it. */
const STATUS_PLACE =
  "absolute top-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-background px-1 text-center @2xl:px-2 text-small leading-[15px] @2xl:top-[1.43cqw] @2xl:text-[clamp(10px,1.43cqw,16px)] @2xl:leading-normal";
const STATUS_KICKER =
  "block font-semibold uppercase @2xl:tracking-head @2xl:text-[clamp(10px,1.07cqw,12px)] @2xl:leading-[1.33]";
const CAPTION_ON_ICE =
  "max-w-[50cqw] truncate border border-rule bg-background px-4 py-1 text-small leading-5";
/* Under the ice where the ice is too small to write on. Two lines tall, so it never jumps. */
const CAPTION_UNDER_ICE =
  "mt-1 line-clamp-2 min-h-10 border-rule-head border-b py-0.5 text-small leading-[18px] @2xl:hidden";
/* A goal's caption is a flag beside two lines, each cut short, in the same room as any other's. */
const GOAL_CAPTION_ON_ICE =
  "flex max-w-[56cqw] items-stretch border border-rule bg-background text-small leading-5";
const GOAL_CAPTION_UNDER_ICE =
  "mt-1 flex min-h-10 items-stretch border-rule-head border-b text-small leading-[18px] @2xl:hidden";

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
      line={place}
      word
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
            <span className={`${STATUS_KICKER} text-note`}>
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
      className={`absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap text-small text-note [writing-mode:vertical-rl] @2xl:block ${
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

/**
 * "GOAL" over centre ice while a goal's sequence is on the ice, which the player shows and hides.
 * It stands on the live marker's line (the player dims the marker under it) or, in a Replay, which
 * has no such line, under the clock. The word is CSS's, so the status still reads as it did.
 */
function GoalKicker({ live }: { live: boolean }) {
  return (
    <span
      data-fx="goal-kicker"
      aria-hidden="true"
      className={`${STATUS_KICKER} absolute inset-x-0 font-bold text-live opacity-0 before:content-['Goal'] ${
        live ? "top-0" : "top-full"
      }`}
    />
  );
}

/**
 * The play in focus, in words. A goal's are a flag in the one red, the scorer, and how it was scored, led by the strength so that a long
 * list of assists cannot push it out of sight.
 */
function Caption({ play, team }: { play: Play; team: GameHeaderSide | undefined }) {
  const time = <span className="font-normal opacity-60">{playTime(play)}</span>;
  if (markKind(play) !== "goal") {
    return (
      <>
        {play.text} {time}
      </>
    );
  }
  const { scorer, tally, how, strength, shootout } = goalCall(play);
  const who = scorer == null ? play.text : `${scorer}${tally == null ? "" : ` (${tally})`}`;
  const said = [strength && STRENGTH_WORDS[strength], shootout && "shootout", scorer != null && how]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <span
        data-fx="caption-part"
        data-slot="goal-flag"
        className="flex flex-none items-center bg-kicker px-3 font-bold text-background text-tag tracking-mark"
      >
        GOAL
      </span>
      <span data-fx="caption-part" className="min-w-0 self-center px-3 py-0.5 max-@2xl:pr-0">
        <span data-slot="goal-scorer" className="block truncate font-bold">
          {team && `${team.abbreviation} · `}
          {who} {time}
        </span>
        <span data-slot="goal-how" className="block truncate opacity-70">
          {said}
        </span>
      </span>
    </>
  );
}

/**
 * The rink as the page: the ice filling the width, the score, shots and clock laid over it, and
 * the play in focus ringed and captioned. Shots, saves, misses and penalties are played on the
 * ice as they arrive, and when a play is picked (`RinkAnimations`). Under it is the penalty box,
 * and while a team has the advantage the zone it attacks is ruled in ink.
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
  // The words are the play in focus's, but for a goal whose sequence is on the ice: a poll of
  // ESPN often brings the faceoff after a goal with it, and the scorer is still who to name.
  const [goalOnIce, setGoalOnIce] = useState<string | null>(null);
  const captioned =
    (goalOnIce != null && played.find((play) => play.id === goalOnIce && play.scoring)) || focus;
  const goal = captioned != null && markKind(captioned) === "goal";
  const caption = captioned != null && (
    <Caption
      play={captioned}
      team={[header.home, header.away].find((side) => side.id === captioned.teamId)}
    />
  );

  // The box and the advantage are the game's as it stands (a Replay's at its playhead), not the
  // picked play's: like the score, they do not move when a tick is clicked.
  // A finished game laid out whole has nobody left in it, whether or not its last play says so.
  const over = header.status === "final" && played.length === plays.length;
  const penalties = over
    ? NO_PENALTIES
    : penaltyState(
        played,
        { homeTeamId: header.home.id, awayTeamId: header.away.id, seasonType: header.seasonType },
        clock,
      );
  const ahead = [header.away, header.home].find((s) => s.id === penalties.advantage?.teamId);
  // The zone is ruled only while the ice shows the ends of the period being played: with a play
  // of another period picked, the ends are that period's, and the box alone says who is ahead.
  const attacked =
    ahead && period === penalties.period
      ? attackedEnd(plays, header.home.id, ahead.id, period)
      : null;
  const powerPlay = ahead && attacked ? { end: attacked } : null;
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
          live={header.status === "live"}
          onGoal={setGoalOnIce}
        />
        <div data-slot="rink-overlay" className="pointer-events-none absolute inset-0">
          <Score side={header.away} place="away" />
          <div data-slot="rink-status" className={STATUS_PLACE}>
            {live && <LiveMarker className={STATUS_KICKER} />}
            <GoalKicker live={live} />
            {status ?? text}
            {notice != null && (
              <span data-slot="rink-notice" className="block text-small text-live leading-[15px]">
                {notice}
              </span>
            )}
          </div>
          <Score side={header.home} place="home" />
          <EndLabel end="left" {...ends} />
          <EndLabel end="right" {...ends} />
          {captioned != null && (
            <div className="absolute inset-x-0 bottom-[1.96cqw] hidden justify-center @2xl:flex">
              <p
                data-slot="rink-caption"
                data-play={captioned.id}
                className={goal ? GOAL_CAPTION_ON_ICE : CAPTION_ON_ICE}
                title={captioned.text}
              >
                {caption}
              </p>
            </div>
          )}
        </div>
      </div>
      <PenaltyBox header={header} state={penalties} />
      <p
        data-slot="rink-caption"
        data-play={captioned?.id}
        className={goal ? GOAL_CAPTION_UNDER_ICE : CAPTION_UNDER_ICE}
      >
        {caption}
      </p>
    </div>
  );
}
