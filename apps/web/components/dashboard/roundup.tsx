import type { MadeSlatePick, ScoreboardGame } from "@yogan-hockey/schemas";
import { liveDot } from "@yogan-hockey/ui/components/marker";
import {
  briefGame,
  briefPick,
  deck,
  gamePickOutcome,
  headline,
  leadsAndBriefs,
  noGames,
  onTv,
  pickLine,
  rec,
  roundupKicker,
  statusText,
} from "../../lib/agate-copy";
import { gameHref } from "../../lib/scoreboard-view";
import { lineScore } from "../../lib/story";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { PickMark, useZone, type Zone } from "../story/story-parts";
import { column, columns, label, link, sectionHead, sectionTitle, table } from "./front";

/** The made picks of today's games by game id, as Home's loader read them. */
export type Picks = Readonly<Record<string, MadeSlatePick>>;

/**
 * Right or Wrong as the front page writes it: the word in the colour of a gain or a loss, with no
 * box round it (a `PickMark` is a filled or outlined one).
 */
function Verdict({ outcome }: { outcome: "right" | "wrong" }) {
  return (
    <span
      data-slot="pick-outcome"
      data-outcome={outcome}
      className={`font-medium ${outcome === "right" ? "text-positive" : "text-negative"}`}
    >
      {outcome === "right" ? "Right" : "Wrong"}
    </span>
  );
}

/**
 * A lead's line score: team, record and, once there is a score, the shots (where the Scoreboard
 * has them) and the score, the away side over the home side. The side ahead at the end is bold.
 */
function LineScore({ game }: { game: ScoreboardGame }) {
  const { caption, score, sides } = lineScore(game);
  const shots = score != null && sides.some((side) => side.shots != null);
  const figure = `${table.cell} text-right`;
  return (
    <table data-slot="line-score" className={table.table}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className={table.head}>
          <th scope="col" className={`${table.column} ${table.quiet} text-left`}>
            Team
          </th>
          <th scope="col" className={`${table.column} ${table.quiet} text-right`}>
            <abbr title="Record" className="no-underline">
              Rec
            </abbr>
          </th>
          {shots && (
            <th scope="col" className={`${table.column} ${table.quiet} w-12 text-right`}>
              <abbr title="Shots on goal" className="no-underline">
                SOG
              </abbr>
            </th>
          )}
          {score != null && (
            <th scope="col" className={`${table.column} ${table.quiet} w-9 text-right`}>
              {score === "F" ? (
                <abbr title="Final" className="no-underline">
                  F
                </abbr>
              ) : (
                score
              )}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {sides.map((side) => (
          <tr key={side.id} className={table.row}>
            <th
              scope="row"
              className={`${table.cell} text-left ${side.winner ? "font-label" : "font-normal"}`}
            >
              {side.name}
            </th>
            <td className={`${figure} text-muted-foreground`}>
              {side.record == null ? "" : rec(side.record)}
            </td>
            {shots && (
              <td data-slot="line-shots" className={`${figure} w-12 text-muted-foreground`}>
                {side.shots ?? ""}
              </td>
            )}
            {side.score != null && (
              <td className={`${figure} w-9 ${side.winner ? "font-label" : ""}`}>{side.score}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A lead: one game as a column of the roundup. Its status and where it is played, the score as a
 * headline, a sentence, the line score, and on the column's floor the pick and who is showing it.
 * `className` is the column's place in the row (`column`).
 */
function Story({
  game,
  pick,
  zone,
  className,
}: {
  game: ScoreboardGame;
  pick: MadeSlatePick | undefined;
  zone: Zone;
  className: string;
}) {
  const picked = pickLine(pick, game);
  const shownOn = onTv(game.broadcasts);
  const live = game.status === "live";
  return (
    <article
      data-slot="story"
      data-live={live ? "" : undefined}
      className={`gap-3 md:min-h-[300px] ${className}`}
    >
      <p data-slot="kicker" className={label}>
        <span className="font-label text-kicker">
          {live && (
            // "Live" is in the words beside it.
            <span aria-hidden="true" data-slot="live-dot" className={liveDot} />
          )}
          {statusText(game, ...zone)}
        </span>
        {game.venue && ` · ${game.venue}`}
      </p>
      <h3 className="text-balance font-serif font-strong text-[34px] leading-[1.05] tracking-[-0.01em]">
        <Link href={gameHref(game)} className={`${link} tap-target hover:text-kicker`}>
          {headline(game)}
        </Link>
      </h3>
      <p data-slot="deck">{deck(game)}</p>
      <LineScore game={game} />
      {(picked != null || shownOn != null) && (
        // Held to the column's floor, so the row's last lines are level.
        <div data-slot="story-foot" className="mt-auto flex flex-col gap-1 text-[15px]">
          {picked != null && (
            <p data-slot="story-pick">
              {picked.sentence}
              {picked.outcome != null && (
                <>
                  {" — "}
                  <Verdict outcome={picked.outcome} />
                </>
              )}
            </p>
          )}
          {shownOn != null && (
            <p data-slot="on-tv" className="font-agate text-[13px] text-muted-foreground">
              <span className="sr-only">On TV: </span>
              {shownOn}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * A brief: the game on one line, its status and its pick on the next. Home's are the games that
 * do not lead; the Picks page's are the whole slate (`components/picks/picks-page.tsx`).
 *
 * `front` is the front page's brief (#240): a hairline under it, not a dotted rule, and its pick
 * marked by a word in colour, not a box.
 */
export function Brief({
  game,
  pick,
  zone,
  front = false,
}: {
  game: ScoreboardGame;
  pick: MadeSlatePick | undefined;
  zone: Zone;
  front?: boolean;
}) {
  const picked = briefPick(pick, game);
  const outcome = gamePickOutcome(pick, game);
  return (
    <li
      data-slot="brief"
      className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-[2px] border-b py-[9px] ${front ? "border-hairline font-agate" : "border-border border-dotted"}`}
    >
      <Link
        href={gameHref(game)}
        className={`${link} tap-target col-span-full font-label text-[16px] ${front ? "hover:text-kicker" : "hover:underline"}`}
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
            {picked}{" "}
            {front ? outcome && <Verdict outcome={outcome} /> : <PickMark outcome={outcome} />}
          </>
        )}
      </span>
    </li>
  );
}

/**
 * The top of Home: today's games as a paper would run them. Up to three lead, as the ruled
 * columns of the roundup, and the rest are briefs under "Around the league" (`leadsAndBriefs`:
 * live games, then the next to start, then the latest finals, each list in the slate's stable
 * order). The Scoreboard socket keeps every score and status current, and a game changes list
 * only when its status changes.
 *
 * The picks are not this component's to read (they are in D1, and this is the browser): the page
 * hands them in, and each is marked right or wrong here once the socket says its game is final.
 */
export function Roundup({ picks }: { picks: Picks }) {
  const { date, games } = useScoreboard();
  const zone = useZone();
  const { leads, briefs } = leadsAndBriefs(games);
  const standing = roundupKicker(games);
  return (
    <>
      <section aria-labelledby="roundup-heading" data-slot="roundup">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-[26px] pb-3">
          <h2 id="roundup-heading" className="font-serif font-strong text-[26px] leading-none">
            NHL Roundup
          </h2>
          {standing != null && (
            <p
              data-slot="roundup-kicker"
              className="font-agate text-[13px] text-kicker uppercase leading-[1.35] tracking-[0.1em]"
            >
              {standing}
            </p>
          )}
        </div>
        {leads.length > 0 ? (
          <div data-slot="roundup-columns" className={columns(leads.length)}>
            {leads.map((game, index) => (
              <Story
                key={game.id}
                game={game}
                pick={picks[game.id]}
                zone={zone}
                className={column(index, leads.length)}
              />
            ))}
          </div>
        ) : (
          <p data-slot="no-games" className="border-rule border-y py-5">
            {noGames(date)}
          </p>
        )}
      </section>
      {briefs.length > 0 && (
        <section aria-labelledby="briefs-heading" data-slot="briefs" className="pt-7">
          <div className={sectionHead}>
            <h2 id="briefs-heading" className={sectionTitle}>
              Around the league
            </h2>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-x-8">
            {briefs.map((game) => (
              <Brief key={game.id} game={game} pick={picks[game.id]} zone={zone} front />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
