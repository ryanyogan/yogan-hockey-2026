import type { SeasonRecord } from "@yogan-hockey/schemas";
import {
  DatelinePicks,
  MastheadDate,
  SectionLinks,
  ThemeControl,
  Tonight,
  Wordmark,
} from "./masthead-client";

/** A line of the masthead's small capitals: 13px, in the grey of a label. */
const SMALL_CAPS = "text-[13px] text-muted-foreground uppercase leading-[1.45]";

/**
 * The top of every page, a broadsheet's (#240, `docs/design/front-page`): the dateline strip,
 * then the wordmark over tonight's line, then the sections. Each part ends on a rule: the strip
 * and the sections on a plain one, the wordmark's block on the 3px double rule that only it and
 * the footer have.
 *
 * The strip is the date, the season's picks and Day/Night. A phone has no room for the picks
 * there, so they end the line under the wordmark instead (the copy's `narrow`).
 *
 * The sections stay at the top of the screen as the page scrolls, so they have to be a child of
 * the page's column, not of the `<header>`: a sticky box travels no further than the box that
 * holds it. So this returns the column's parts.
 *
 * The wordmark is Home's `h1`, where no page title is drawn, and a paragraph everywhere else,
 * where the page has its own.
 *
 * `record` is the season's picks, read by the root route's loader with the Scoreboard, so the
 * masthead is whole in the first HTML.
 */
export function Masthead({ record }: { record: SeasonRecord | null }) {
  return (
    <>
      {/*
        In a site opened from the home screen the page can reach under the status bar: the
        sections stop below it (`--safe-top`), and this covers what scrolls past above them. No
        height in a browser tab.
      */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-30 h-(--safe-top) bg-background" />
      <div
        data-slot="dateline-strip"
        className={`flex items-center justify-between gap-x-6 border-rule border-b pt-[14px] pb-[10px] tracking-[0.08em] md:grid md:grid-cols-[1fr_auto_1fr] ${SMALL_CAPS}`}
      >
        <p data-slot="masthead-date" className="whitespace-nowrap">
          <MastheadDate />
        </p>
        <DatelinePicks record={record} />
        <ThemeControl />
      </div>
      <header
        data-slot="masthead"
        className="border-rule border-b-[3px] border-double pt-5 pb-[14px] text-center md:pt-7 md:pb-[18px]"
      >
        <Wordmark />
        <p data-slot="dateline" className={`mt-[14px] tracking-[0.12em] ${SMALL_CAPS}`}>
          <Tonight record={record} />
        </p>
      </header>
      <div
        data-slot="section-nav"
        className="sticky top-(--safe-top) z-30 border-rule border-b bg-background"
      >
        {/*
          Six places fit a 360px phone. On a narrower one the line scrolls inside itself, as it
          did before #240, so the page never scrolls sideways (6px at 320).
        */}
        <nav
          aria-label="Site"
          className="flex whitespace-nowrap max-md:overflow-x-auto max-md:[scrollbar-width:none] md:flex-wrap md:justify-center md:gap-x-10 md:py-[10px]"
        >
          <SectionLinks />
        </nav>
      </div>
    </>
  );
}
