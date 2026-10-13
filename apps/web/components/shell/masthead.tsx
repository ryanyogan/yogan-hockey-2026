import type { SeasonRecord } from "@yogan-hockey/schemas";
import { Dateline, MastheadDate, SectionLinks, ThemeControl, Wordmark } from "./masthead-client";

/**
 * The top of every page, as a newspaper's (`docs/design/agate.md`): the sections' bar first, then
 * the wordmark, then the dateline on the double rule.
 *
 * The bar hangs from a heavy rule over a plain one and stays at the top of the screen as the page
 * scrolls, so it has to be a child of the page's column, not of the `<header>`: a sticky box
 * travels no further than the box that holds it. So this returns the column's parts.
 *
 * The arrangement is the same at every width, and the sections are written once. What differs is
 * what the bar has room for beside them. From `lg` up it is one line in three parts: the date,
 * the sections in the middle, Day/Night at the right end. From `md` the sections start it and
 * Day/Night ends it. On a phone the sections fill it. Where the bar has no room for the date, the
 * date is a line under the wordmark; on a phone the theme's one button ends the dateline. So the
 * date and the control are each written twice and drawn once: one is `display: none` at any width.
 *
 * The wordmark is Home's `h1`, where no page title is drawn, and a paragraph everywhere else,
 * where the page has its own.
 *
 * `record` is the season's picks, read by the root route's loader with the Scoreboard, so the
 * dateline is whole in the first HTML.
 */
export function Masthead({ record }: { record: SeasonRecord | null }) {
  return (
    <>
      {/*
        In a site opened from the home screen the page can reach under the status bar: the bar
        stops below it (`--safe-top`), and this covers what scrolls past above the bar. No height
        in a browser tab.
      */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-30 h-(--safe-top) bg-background" />
      {/*
        The rules are the wrappers' and the phone's sections scroll inside them, since a box that
        scrolls sideways cuts off anything drawn above it.
      */}
      <div
        data-slot="section-nav"
        className="sticky top-(--safe-top) z-30 border-rule border-t-[3px] bg-background"
      >
        <div className="border-rule border-b md:grid md:grid-cols-[1fr_auto] md:items-center lg:grid-cols-[1fr_auto_1fr]">
          <p
            data-slot="section-date"
            className="hidden whitespace-nowrap font-medium text-[13px] uppercase leading-none tracking-[0.06em] lg:block"
          >
            <MastheadDate />
          </p>
          <nav
            aria-label="Site"
            className="flex overflow-x-auto whitespace-nowrap [scrollbar-width:none] md:justify-self-start md:overflow-x-visible"
          >
            <SectionLinks />
          </nav>
          <ThemeControl className="hidden md:flex md:justify-self-end" />
        </div>
      </div>
      <header data-slot="masthead" className="text-center">
        <Wordmark />
        <p
          data-slot="masthead-date"
          className="mt-2.5 font-semibold text-[12px] text-label uppercase leading-none tracking-[0.12em] md:mt-3 lg:hidden"
        >
          <MastheadDate />
        </p>
      </header>
      <Dateline record={record} />
    </>
  );
}
