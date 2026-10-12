import type { SeasonRecord } from "@yogan-hockey/schemas";
import { Suspense } from "react";
import { Link } from "../link";
import { ScoreboardGate } from "../scoreboard/scoreboard-provider";
import { Dateline, DatelineFrame, SectionLinks, ShortDate, ThemeControl } from "./masthead-client";

/** The dateline once the season's record has been read; the Scoreboard keeps the rest current. */
async function DatelineWithRecord({ record }: { record: Promise<SeasonRecord | null> }) {
  const known = await record;
  return (
    <ScoreboardGate fallback={<DatelineFrame />}>
      <Dateline record={known} />
    </ScoreboardGate>
  );
}

/**
 * The top of every page, as a newspaper's (`docs/design/agate.md`): a utility bar, the wordmark,
 * and the dateline on its double rule.
 *
 * From `md` up the utility bar holds the sections and the Day/Night control, and the dateline's
 * three parts run across the page. On a phone the bar holds the short date and one theme button,
 * and the sections come under the wordmark in a row that scrolls sideways and stays at the top of
 * the screen as the page scrolls; the dateline is one line beneath it.
 *
 * The sections are drawn twice and shown once, as the two layouts put them either side of the
 * wordmark: one is `display: none` at any width, so a visitor is offered one navigation. The
 * phone's has to be a child of the page's column, not of the `<header>`, to stay put: a sticky
 * box travels no further than the box that holds it. So this returns the column's parts.
 *
 * Only what must know the path, the Scoreboard or the theme is a client component. `record` is
 * the season's picks, not waited for: the dateline's rules hold its place.
 */
export function Masthead({ record }: { record: Promise<SeasonRecord | null> }) {
  return (
    <>
      <header data-slot="masthead" className="text-center">
        <div className="flex items-center justify-between gap-x-6 border-rule-head border-b max-md:min-h-12 md:py-2">
          <span className="font-semibold text-[12px] text-label uppercase leading-none tracking-[0.12em] md:hidden">
            <ScoreboardGate fallback={null}>
              <ShortDate />
            </ScoreboardGate>
          </span>
          <nav aria-label="Site" className="hidden gap-x-5 md:flex">
            <SectionLinks />
          </nav>
          <ThemeControl />
        </div>
        {/*
          Not a heading: each page has its own first one. One line at any width: 54px fills a
          390px phone's column to within 2px, so on a narrower one it shrinks with the screen.
        */}
        <p
          data-slot="wordmark"
          className="mt-[18px] whitespace-nowrap font-bold font-serif text-[min(54px,13.85vw)] leading-[0.95] tracking-[-0.025em] [font-variation-settings:'opsz'_72] md:mt-7 md:text-[clamp(54px,9vw,120px)] md:leading-[0.92]"
        >
          <Link href="/">Yogan Hockey</Link>
        </p>
      </header>
      {/*
        The phone's sections, under the double rule: 3px, a 2px gap, then the row's own 1px. The
        rules are the wrapper's and the row scrolls inside it, since a box that scrolls sideways
        cuts off anything drawn above it.
      */}
      <div
        data-slot="section-nav"
        className="sticky top-0 z-30 mt-[14px] border-rule border-t-[3px] bg-background pt-[2px] md:hidden"
      >
        <nav
          aria-label="Site"
          className="flex justify-between overflow-x-auto whitespace-nowrap border-rule border-y [scrollbar-width:none]"
        >
          <SectionLinks />
        </nav>
      </div>
      <Suspense fallback={<DatelineFrame />}>
        <DatelineWithRecord record={record} />
      </Suspense>
    </>
  );
}
