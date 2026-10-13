import type { MadeSlatePick, ScoreboardGame } from "@yogan-hockey/schemas";
import {
  briefGame,
  briefPick,
  deck,
  gamePickOutcome,
  headline,
  leadsAndBriefs,
  noGames,
  pickSentence,
  statusText,
} from "../../lib/agate-copy";
import { gameHref } from "../../lib/scoreboard-view";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import {
  OnTv,
  PickMark,
  StoryKicker,
  StoryLineScore,
  useZone,
  type Zone,
} from "../story/story-parts";
import { storyDeck, storyHeadline, storyPick, storyRule } from "../story/type";
import { label, link, ruledLabel } from "./agate";

/** The made picks of today's games by game id, as Home's loader read them. */
export type Picks = Readonly<Record<string, MadeSlatePick>>;

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
  const sentence = pickSentence(pick, game);
  return (
    <article
      data-slot="story"
      data-live={game.status === "live" ? "" : undefined}
      className={`flex min-w-0 flex-col gap-3 ${storyRule}`}
    >
      <StoryKicker game={game} zone={zone} />
      <h3 className={storyHeadline}>
        <Link
          href={gameHref(game)}
          className={`${link} tap-target hover:underline hover:decoration-2`}
        >
          {headline(game)}
        </Link>
      </h3>
      <p data-slot="deck" className={storyDeck}>
        {deck(game)}
      </p>
      <StoryLineScore game={game} />
      {sentence != null && (
        <p data-slot="story-pick" className={storyPick}>
          {sentence} <PickMark outcome={gamePickOutcome(pick, game)} />
        </p>
      )}
      <OnTv broadcasts={game.broadcasts} />
    </article>
  );
}

/**
 * A brief: the game on one line, its status and its pick on the next. Home's are the games that
 * do not lead; the Picks page's are the whole slate (`components/picks/picks-page.tsx`).
 */
export function Brief({
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
          <p className={`${storyRule} ${storyDeck}`}>{noGames(date)}</p>
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
