"use client";

import type { MadeSlatePick, ScoreboardGame } from "@yogan-hockey/schemas";
import {
  briefGame,
  briefPick,
  deck,
  gamePickOutcome,
  headline,
  kicker,
  leadsAndBriefs,
  pickSentence,
  rec,
  statusText,
} from "../../lib/agate-copy";
import { NHL_TIME_ZONE } from "../../lib/game-time";
import { lineScore } from "../../lib/home";
import { gameHref } from "../../lib/scoreboard-view";
import { useHydrated } from "../../lib/use-hydrated";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { agate, label, mark, ruledLabel } from "./agate";

/** The made picks of today's games by game id, as the page's server component read them. */
export type Picks = Readonly<Record<string, MadeSlatePick>>;

/**
 * The zone a start time is written in, and its mark. The server knows only the NHL's, and writes
 * "8:40 PM ET"; the browser writes the visitor's own once the page has hydrated, as `LocalTime`
 * does, so the two never disagree about the same markup.
 */
type Zone = [timeZone: string | undefined, mark: string];
const useZone = (): Zone => (useHydrated() ? [undefined, ""] : [NHL_TIME_ZONE, " ET"]);

/** Right or Wrong beside a final's pick. Nothing before the game is final. */
function PickMark({ outcome }: { outcome: "right" | "wrong" | null }) {
  if (outcome == null) return null;
  return (
    <span data-slot="pick-outcome" data-outcome={outcome} className={mark}>
      {outcome === "right" ? "Right" : "Wrong"}
    </span>
  );
}

/** Team, record and the score once there is one, the away side over the home side. */
function LineScore({ game }: { game: ScoreboardGame }) {
  const { caption, score, sides } = lineScore(game);
  const figure = `${agate.cell} py-[6px] text-[16px]`;
  const record = "w-[72px] text-aside max-md:w-16";
  return (
    <table data-slot="line-score" className={`${agate.table} border-rule border-y`}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={agate.head}>
            Team
          </th>
          <th scope="col" className={`${agate.head} ${record}`}>
            Rec
          </th>
          {score != null && (
            <th scope="col" className={`${agate.head} w-10`}>
              {score}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {sides.map((side) => (
          <tr key={side.id} className={agate.row}>
            <th
              scope="row"
              className={`${agate.rowHead} ${side.winner ? "font-bold" : "font-normal"}`}
            >
              {side.name}
            </th>
            <td className={`${figure} ${record}`}>{side.record == null ? "" : rec(side.record)}</td>
            {side.score != null && (
              <td className={`${figure} w-10 ${side.winner ? "font-bold" : ""}`}>{side.score}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A lead: one game written up in full, under a heavy rule that is red while the game is on. */
function Story({
  game,
  pick,
  zone,
}: {
  game: ScoreboardGame;
  pick: MadeSlatePick | undefined;
  zone: Zone;
}) {
  const live = game.status === "live";
  const sentence = pickSentence(pick, game);
  const shownOn = game.broadcasts?.join(", ");
  return (
    <article
      data-slot="story"
      data-live={live ? "" : undefined}
      className="flex min-w-0 flex-col gap-3 border-rule border-t-[3px] pt-[14px] data-live:border-live"
    >
      <p
        data-slot="kicker"
        className="font-semibold text-[12px] text-kicker uppercase normal-nums leading-[1.35] tracking-[0.14em]"
      >
        {live && (
          // "Live" is in the words beside it.
          <span
            aria-hidden="true"
            data-slot="live-dot"
            className="mr-[6px] inline-block size-2 animate-[live-dot_1.6s_ease-in-out_infinite] rounded-[50%] bg-live align-[1px] motion-reduce:animate-none"
          />
        )}
        {kicker(game, ...zone)}
      </p>
      <h3 className="text-balance font-bold font-serif text-[34px] normal-nums leading-[1.02] tracking-[-0.015em] [font-variation-settings:'opsz'_60] md:text-[clamp(34px,3vw,40px)]">
        <Link href={gameHref(game)} className="tap-target hover:underline hover:decoration-2">
          {headline(game)}
        </Link>
      </h3>
      <p
        data-slot="deck"
        className="font-serif text-[18px] text-note normal-nums leading-[1.4] md:text-[clamp(18px,1.4vw,19px)]"
      >
        {deck(game)}
      </p>
      <LineScore game={game} />
      {sentence != null && (
        <p
          data-slot="story-pick"
          className="font-serif text-[17px] normal-nums italic leading-[1.4]"
        >
          {sentence} <PickMark outcome={gamePickOutcome(pick, game)} />
        </p>
      )}
      {shownOn && (
        <p data-slot="on-tv" className="text-[13px] text-aside leading-[1.5]">
          <strong className="font-semibold text-foreground">On TV</strong> {shownOn}
        </p>
      )}
    </article>
  );
}

/** A brief: the game on one line, its status and its pick on the next. */
function Brief({
  game,
  pick,
  zone,
}: {
  game: ScoreboardGame;
  pick: MadeSlatePick | undefined;
  zone: Zone;
}) {
  const picked = briefPick(pick, game);
  return (
    <li
      data-slot="brief"
      className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-[2px] border-border border-b border-dotted py-[9px]"
    >
      <Link
        href={gameHref(game)}
        className="tap-target col-span-full font-semibold text-[16px] hover:underline"
      >
        {briefGame(game)}
      </Link>
      <span
        data-slot="brief-status"
        data-live={game.status === "live" ? "" : undefined}
        className="text-[14px] text-aside data-live:font-semibold data-live:text-live"
      >
        {statusText(game, ...zone)}
      </span>
      <span data-slot="brief-pick" className="text-right text-[14px]">
        {picked == null ? (
          <span className="text-aside">No pick</span>
        ) : (
          <>
            {picked} <PickMark outcome={gamePickOutcome(pick, game)} />
          </>
        )}
      </span>
    </li>
  );
}

/**
 * The top of Home: today's games as a paper would run them. Up to three lead as full stories and
 * the rest are briefs under "Around the league" (`leadsAndBriefs`: live games, then the next to
 * start, then the latest finals, each list in the slate's stable order). The Scoreboard socket
 * keeps every score and status current, and a game changes list only when its status changes.
 *
 * The picks are not this component's to read (they are in D1, and this is the browser): the page
 * hands them in, and each is marked right or wrong here once the socket says its game is final.
 */
export function Roundup({ picks }: { picks: Picks }) {
  const { date, games } = useScoreboard();
  const zone = useZone();
  const { leads, briefs } = leadsAndBriefs(games);
  return (
    <>
      <section aria-labelledby="roundup-heading" data-slot="roundup">
        <h2 id="roundup-heading" className={`${label} mb-4`}>
          NHL Roundup
        </h2>
        {leads.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7 md:gap-8">
            {leads.map((game) => (
              <Story key={game.id} game={game} pick={picks[game.id]} zone={zone} />
            ))}
          </div>
        ) : (
          // Without a date the Scoreboard has not answered yet, which is not a day off.
          <p className="border-rule border-t-[3px] pt-[14px] font-serif text-[18px] text-note normal-nums leading-[1.4]">
            {date == null
              ? "Today's games could not be read. They appear here as soon as they can be."
              : "No games scheduled today."}
          </p>
        )}
      </section>
      {briefs.length > 0 && (
        <section aria-labelledby="briefs-heading" data-slot="briefs" className="mt-8 md:mt-11">
          <h2 id="briefs-heading" className={ruledLabel}>
            Around the league
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-x-7 md:gap-x-8">
            {briefs.map((game) => (
              <Brief key={game.id} game={game} pick={picks[game.id]} zone={zone} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
