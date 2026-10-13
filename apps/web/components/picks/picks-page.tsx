import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { PageHeader, Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { useId } from "react";
import { noGames } from "../../lib/agate-copy";
import { slateDay } from "../../lib/game-time";
import type { Call, PicksFigures, Tally } from "../../lib/picks-figures";
import type { PicksPage as PicksPageRead } from "../../lib/picks-page";
import {
  BEST_CALL,
  bandLabel,
  COLUMNS_LABEL,
  callSentence,
  FIGURES_UNREAD,
  noFigures,
  PICKS_LEDE,
  PICKS_TITLE,
  record,
  runWords,
  SIDE_LABELS,
  share,
  TONIGHT_LABEL,
  WORST_CALL,
  weekLabel,
  weekSpan,
} from "../../lib/picks-page-copy";
import { gameHref } from "../../lib/scoreboard-view";
import { PieceGrid } from "../dashboard/pieces";
import { Brief } from "../dashboard/roundup";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { useZone } from "../story/story-parts";
import { emptyProse, storyDeck } from "../story/type";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** A big figure over the words that say what it counts: the record, the run. */
function Stat({ figure, name }: { figure: string; name: string }) {
  return (
    <div data-slot="picks-stat" className="flex flex-col-reverse gap-1">
      <dt className="font-strong text-head text-label uppercase tracking-head">{name}</dt>
      <dd className="whitespace-nowrap font-serif font-strong text-stat tabular-nums lining-nums">
        {figure}
      </dd>
    </div>
  );
}

/**
 * One way of cutting the picks, in agate: a row for each part with how many picks it has, how
 * many were right and wrong, and the share that were right in bold. A part with no picks has its
 * row and no share, so the table is the same shape from the season's first week.
 */
function Split({
  title,
  of,
  rows,
}: {
  title: string;
  /** What a row is: the first column's head. */
  of: string;
  rows: readonly (Tally & { name: string })[];
}) {
  const id = useId();
  const figure = "w-12";
  return (
    <div data-slot="picks-split" className="min-w-0">
      <h3 id={id} className="mb-1 font-strong text-label text-tag uppercase tracking-head">
        {title}
      </h3>
      <Ledger aria-labelledby={id}>
        <LedgerHead>
          <LedgerColumn>{of}</LedgerColumn>
          <LedgerColumn numeric className={figure}>
            Picks
          </LedgerColumn>
          <LedgerColumn numeric className={figure}>
            Right
          </LedgerColumn>
          <LedgerColumn numeric className={figure}>
            Wrong
          </LedgerColumn>
          <LedgerColumn numeric className={figure}>
            Pct
          </LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          {rows.map((row) => (
            <LedgerRow key={row.name}>
              <LedgerCell className="whitespace-nowrap">{row.name}</LedgerCell>
              <LedgerCell numeric tone="aside">
                {row.right + row.wrong}
              </LedgerCell>
              <LedgerCell numeric>{row.right}</LedgerCell>
              <LedgerCell numeric>{row.wrong}</LedgerCell>
              <LedgerCell numeric tone="strong">
                {share(row)}
              </LedgerCell>
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </div>
  );
}

/** The week's best or worst call: a red line saying which, and the call as a sentence that links to its game. */
function CallLine({ name, call }: { name: string; call: Call | null }) {
  if (call == null) return null;
  return (
    <div data-slot="picks-call" className="min-w-0">
      <dt className="font-label text-kicker text-tag uppercase leading-[1.35] tracking-kicker">
        {name}
      </dt>
      <dd className="mt-1 max-w-[680px] font-serif text-prose">
        <Link
          href={gameHref({ id: call.gameId })}
          className="tap-target block hover:underline max-md:min-h-11"
        >
          {callSentence(call)}
        </Link>
      </dd>
    </div>
  );
}

/**
 * The figures: the week's record, the run and the season's record as big figures; then the week
 * by day and the season by how sure the pick was and by which team was picked; then the week's
 * best and worst calls. Before any pick is decided, and when D1 did not answer, a sentence.
 */
function Figures({ figures }: { figures: PicksFigures | null }) {
  const { week, run } = figures ?? {};
  if (figures == null || week == null || run == null) {
    return (
      <Section data-slot="picks-figures" aria-label={weekLabel({ current: true })}>
        <SectionHeader title={weekLabel({ current: true })} />
        <p className={`mt-3 ${emptyProse}`}>
          {figures == null ? FIGURES_UNREAD : noFigures(figures.awaiting)}
        </p>
      </Section>
    );
  }
  const streak = runWords(run);
  return (
    <Section data-slot="picks-figures" aria-label={weekLabel(week)}>
      <SectionHeader title={weekLabel(week)} count={weekSpan(week)} />
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-4 md:gap-x-16">
        <Stat figure={record(week.tally)} name={week.current ? "This week" : "That week"} />
        <Stat figure={streak.figure} name={streak.key} />
        <Stat figure={record(figures.season)} name="This season" />
      </dl>
      <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-x-8 gap-y-7">
        <Split
          title="By day"
          of="Day"
          rows={week.days.map((day) => ({ ...day, name: slateDay(day.date) }))}
        />
        <Split
          title="By how sure, this season"
          of="Chance"
          rows={figures.bands.map((band) => ({ ...band, name: bandLabel(band) }))}
        />
        <Split
          title="By side, this season"
          of="Pick"
          rows={[
            { ...figures.sides.home, name: SIDE_LABELS.home },
            { ...figures.sides.road, name: SIDE_LABELS.road },
          ]}
        />
      </div>
      {(week.best != null || week.worst != null) && (
        <dl className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-x-8 gap-y-5">
          <CallLine name={BEST_CALL} call={week.best} />
          <CallLine name={WORST_CALL} call={week.worst} />
        </dl>
      )}
    </Section>
  );
}

/**
 * Tonight's games, each a brief as Home has them: the game, which links to its page, its status
 * and its pick, marked once the game is final. The games are the Scoreboard's, so a score and a
 * mark arrive by the socket; the picks are the loader's.
 */
function Tonight({ picks }: { picks: PicksPageRead["picks"] }) {
  const { date, games } = useScoreboard();
  const zone = useZone();
  return (
    <Section data-slot="picks-tonight" aria-label={TONIGHT_LABEL}>
      <SectionHeader
        title={TONIGHT_LABEL}
        count={games.length > 0 ? plural(games.length, "game") : undefined}
      />
      {games.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-x-7 md:gap-x-8">
          {games.map((game) => (
            <Brief key={game.id} game={game} pick={picks[game.id]} zone={zone} />
          ))}
        </ul>
      ) : (
        <p className={`mt-3 ${emptyProse}`}>{noGames(date)}</p>
      )}
    </Section>
  );
}

/**
 * `/picks` (#218): how the site's picks have done, tonight's picks, and the columns a model
 * writes about them. Everything but tonight's games is the loader's (`lib/picks-page.ts`), so it
 * is all in the page as it is sent.
 */
export function PicksPage({ page }: { page: PicksPageRead }) {
  return (
    <>
      <div>
        <PageHeader title={PICKS_TITLE} />
        <p className={`max-w-[680px] max-md:mt-2 ${storyDeck} tabular-nums`}>{PICKS_LEDE}</p>
      </div>
      <Figures figures={page.figures} />
      <Tonight picks={page.picks} />
      {page.columns != null && page.columns.length > 0 && (
        <Section data-slot="picks-columns" aria-label={COLUMNS_LABEL}>
          <SectionHeader title={COLUMNS_LABEL} className="mb-4 border-b-0 pb-0" />
          <PieceGrid pieces={page.columns} figures="page" />
        </Section>
      )}
    </>
  );
}
