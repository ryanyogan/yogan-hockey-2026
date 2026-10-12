import type { SeasonRecord } from "@yogan-hockey/schemas";
import { Dateline, MastheadDate, SectionLinks, ThemeControl, Wordmark } from "./masthead-client";

/**
 * The top of every page, as a newspaper's (`docs/design/agate.md`): the wordmark first, with
 * nothing above it; under it the sections, in a row between the double rule and a plain one; then
 * the dateline.
 *
 * The arrangement is the same at every width, and the sections are written once. Their row stays
 * at the top of the screen as the page scrolls, so it has to be a child of the page's column, not
 * of the `<header>`: a sticky box travels no further than the box that holds it. So this returns
 * the column's parts.
 *
 * What differs by width is where the room is. From `md` up the sections sit in the middle of
 * their row with the Day/Night control at its end, and the dateline's three parts run across the
 * page, the date first. On a phone the sections fill the row, so the date is a line under the
 * wordmark and the theme's one button ends the dateline. The control is therefore written twice
 * and drawn once: one is `display: none` at any width.
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
      <header data-slot="masthead" className="text-center">
        <Wordmark />
        <p
          data-slot="masthead-date"
          className="mt-2.5 font-semibold text-[12px] text-label uppercase leading-none tracking-[0.12em] md:hidden"
        >
          <MastheadDate />
        </p>
      </header>
      {/*
        In a site opened from the home screen the page can reach under the status bar: the row
        stops below it (`--safe-top`), and this covers what scrolls past above the row. No height
        in a browser tab.
      */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-30 h-(--safe-top) bg-background" />
      {/*
        The sections, under the double rule: 3px, a 2px gap, then the row's own 1px. The rules are
        the wrappers' and the phone's row scrolls inside them, since a box that scrolls sideways
        cuts off anything drawn above it.
      */}
      <div
        data-slot="section-nav"
        className="sticky top-(--safe-top) z-30 mt-3 border-rule border-t-[3px] bg-background pt-[2px] md:mt-5"
      >
        <div className="border-rule border-y md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          <nav
            aria-label="Site"
            className="flex justify-between overflow-x-auto whitespace-nowrap [scrollbar-width:none] md:col-start-2 md:gap-x-5 md:overflow-x-visible"
          >
            <SectionLinks />
          </nav>
          <ThemeControl className="hidden md:col-start-3 md:flex md:justify-self-end" />
        </div>
      </div>
      <Dateline record={record} />
    </>
  );
}
