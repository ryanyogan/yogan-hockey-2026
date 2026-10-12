"use client";

import type { MadeSlatePick, ScoreboardGame } from "@yogan-hockey/schemas";
import { badgeVariants } from "@yogan-hockey/ui/components/badge";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { liveDot } from "@yogan-hockey/ui/components/marker";
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
import { agate, label, link, ruledLabel } from "./agate";

/** The made picks of today's games by game id, as the page's server component read them. */
export type Picks = Readonly<Record<string, MadeSlatePick>>;

/**
 * The zone a start time is written in, and its mark. The server knows only the NHL's, and writes
 * "8:40 PM ET"; the browser writes the visitor's own once the page has hydrated, as `LocalTime`
 * does, so the two never disagree about the same markup.
 */
type Zone = [timeZone: string | undefined, mark: string];
const useZone = (): Zone => (useHydrated() ? [undefined, ""] : [NHL_TIME_ZONE, " ET"]);

/**
 * Right (filled) or Wrong (outlined) beside a final's pick: a `Badge`'s two marks, upright in an
 * italic sentence. Nothing before the game is final.
 */
function PickMark({ outcome }: { outcome: "right" | "wrong" | null }) {
  if (outcome == null) return null;
  return (
    <span
      data-slot="pick-outcome"
      data-outcome={outcome}
      className={badgeVariants({
        variant: outcome === "right" ? "default" : "outline",
        className: "ml-1 font-agate not-italic normal-nums",
      })}
    >
      {outcome === "right" ? "Right" : "Wrong"}
    </span>
  );
}

/** Team, record and the score once there is one, the away side over the home side. */
function LineScore({ game }: { game: ScoreboardGame }) {
  const { caption, score, sides } = lineScore(game);
  // A line score's figures are a size larger than a table's, at every width.
  const figure = `${agate.cell} py-1.5 text-score`;
  const record = "w-[72px] max-md:w-16";
  return (
    <Ledger data-slot="line-score" className="border-rule border-y">
      <caption className="sr-only">{caption}</caption>
      <LedgerHead>
        <LedgerColumn className={agate.head}>Team</LedgerColumn>
        <LedgerColumn numeric className={`${agate.head} ${record}`}>
          Rec
        </LedgerColumn>
        {score != null && (
          <LedgerColumn numeric className={`${agate.head} w-10`}>
            {score}
          </LedgerColumn>
        )}
      </LedgerHead>
      <LedgerBody>
        {sides.map((side) => (
          <LedgerRow key={side.id} className={agate.row}>
            <th
              scope="row"
              className={`py-1.5 text-left text-score normal-nums ${side.winner ? "font-strong" : "font-body"}`}
            >
              {side.name}
            </th>
            <LedgerCell numeric tone="aside" className={`${figure} ${record}`}>
              {side.record == null ? "" : rec(side.record)}
            </LedgerCell>
            {side.score != null && (
              <LedgerCell
                numeric
                tone={side.winner ? "strong" : "default"}
                className={`${figure} w-10`}
              >
                {side.score}
              </LedgerCell>
            )}
          </LedgerRow>
        ))}
      </LedgerBody>
    </Ledger>
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
        className="font-label text-kicker text-tag uppercase normal-nums leading-[1.35] tracking-kicker"
      >
        {live && (
          // "Live" is in the words beside it.
          <span aria-hidden="true" data-slot="live-dot" className={liveDot} />
        )}
        {kicker(game, ...zone)}
      </p>
      <h3 className="text-balance font-serif font-strong text-headline normal-nums [font-variation-settings:'opsz'_60]">
        <Link
          href={gameHref(game)}
          className={`${link} tap-target hover:underline hover:decoration-2`}
        >
          {headline(game)}
        </Link>
      </h3>
      <p data-slot="deck" className="font-serif text-deck text-note normal-nums">
        {deck(game)}
      </p>
      <LineScore game={game} />
      {sentence != null && (
        <p
          data-slot="story-pick"
          className="font-serif text-prose normal-nums italic leading-[1.4]"
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
        className={`${link} tap-target col-span-full font-label text-[16px] hover:underline`}
      >
        {briefGame(game)}
      </Link>
      <span
        data-slot="brief-status"
        data-live={game.status === "live" ? "" : undefined}
        className="text-[14px] text-aside data-live:font-label data-live:text-live"
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
          <p className="border-rule border-t-3 pt-3.5 font-serif text-deck text-note normal-nums">
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
