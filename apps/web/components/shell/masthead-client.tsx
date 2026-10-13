import type { SeasonRecord } from "@yogan-hockey/schemas";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { CREDIT, dateline, datelineDate, datelineYear, SEPARATOR } from "../../lib/agate-copy";
import { currentNavItem, NAV_ITEMS, type NavItem, showsScoreStrip } from "../../lib/nav";
import { useHydrated } from "../../lib/use-hydrated";
import { usePathname, useSearchParam } from "../../lib/use-page-address";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { wordmark } from "./wordmark";

/*
 * The parts of the masthead that the browser must draw: the sections (the path), the date, the
 * picks and tonight's line (the Scoreboard), the theme, and whether the page has a score strip
 * (the path).
 * They are one file so that they are one script: each is a few hundred bytes, and a file of its
 * own costs about as much again on every page.
 */

/**
 * A section: 14px semibold capitals tracked at .14em, 40px apart at a desk, where the row wraps
 * if it must. The current one is in the one red; the one under the pointer is underlined. No
 * cell is filled or ruled: the row's one rule is under it.
 *
 * On a phone the six share the row's width, each as wide as its word and an even part of what
 * is left, 44px tall and never under 44px wide, at 13px and .06em with 3px either side, which
 * fits the six on a 390px phone. Below 390px they go a size down, 12px at .04em with 2px either
 * side, and the six fit a 360px one. That width is written `24.375rem`, in the unit of `max-md`:
 * Tailwind orders two `max-` rules only when their units are the same, and in px this one lost
 * to `max-md`.
 */
const SECTION =
  "inline-flex items-center font-semibold text-[14px] uppercase tracking-[0.14em] underline-offset-4 hover:[&:not([aria-current])]:underline focus-visible:outline-offset-2 aria-[current=page]:text-kicker max-md:min-h-11 max-md:min-w-11 max-md:flex-[1_0_auto] max-md:justify-center max-md:px-[3px] max-md:text-[13px] max-md:leading-none max-md:tracking-[0.06em] max-[24.375rem]:px-[2px] max-[24.375rem]:text-[12px] max-[24.375rem]:tracking-[0.04em]";

function Sections({ current }: { current: NavItem | undefined }) {
  return NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={item === current ? "page" : undefined}
      className={SECTION}
    >
      {item.label}
    </Link>
  ));
}

/**
 * The wordmark, a link home. On Home it is the page's `h1`: Home draws no title of its own, and
 * the paper's name is what that page is. Anywhere else the page's title is the `h1` and this is a
 * paragraph, so every page has exactly one.
 */
export function Wordmark() {
  const Tag = usePathname() === "/" ? "h1" : "p";
  return (
    <Tag data-slot="wordmark" className={wordmark}>
      <Link href="/">Yogan Hockey</Link>
    </Tag>
  );
}

/**
 * The site's six sections as links, the current one marked. It knows the address: the path
 * settles the section everywhere but on `/nhl`, where the `tab` in the query does.
 */
export function SectionLinks() {
  return <Sections current={currentNavItem(usePathname(), useSearchParam("tab"))} />;
}

/**
 * The season's record of the picks, the middle of the dateline strip from `md` up: the count of
 * the right ones in ink. Until a pick is decided it is an empty cell, which keeps Day/Night at
 * the strip's end.
 */
export function DatelinePicks({ record }: { record: SeasonRecord | null }) {
  const { picks } = dateline(useScoreboard(), record);
  return (
    <p data-slot="dateline-picks" className="whitespace-nowrap max-md:hidden">
      {picks && (
        <>
          {picks.label}
          {SEPARATOR}
          <span className="font-semibold text-foreground">{picks.right}</span>
          {SEPARATOR}
          {picks.wrong}
        </>
      )}
    </p>
  );
}

/**
 * The line under the wordmark, current without a refresh: where tonight's games stand, then the
 * credit at a desk; on a phone the counts and the season's picks, which the strip there has no
 * room for. It reads the page's one Scoreboard socket through `useScoreboard()`. A Scoreboard
 * that could not be read leaves the line's height with nothing written on it.
 */
export function Tonight({ record }: { record: SeasonRecord | null }) {
  const { tonight, narrow } = dateline(useScoreboard(), record);
  if (tonight == null) return <span aria-hidden="true">&nbsp;</span>;
  return (
    <>
      <span className="max-md:hidden">
        {tonight}
        {SEPARATOR}
        {CREDIT}
      </span>
      <span className="md:hidden">{narrow}</span>
    </>
  );
}

/**
 * The slate's date, "Sunday, October 11, 2026", which opens the dateline strip; a phone leaves
 * the year out. Before the Scoreboard's first poll it holds the line's height.
 */
export function MastheadDate() {
  const { date } = useScoreboard();
  return (
    <>
      {datelineDate(date) ?? "\u00a0"}
      <span className="max-md:hidden">{datelineYear(date)}</span>
    </>
  );
}

/** Whatever is drawn where the score strip goes, on the pages that have one: all but Home. */
export function ScoreStripPlace({ children }: { children: ReactNode }) {
  return showsScoreStrip(usePathname()) ? children : null;
}

/*
 * A theme's button: a 30px box with an ink edge, 4px from the other. On a phone it answers a
 * thumb 44px tall (`tap-target`), which the strip's 54px has room for.
 */
const THEME_BUTTON =
  "tap-target min-h-[30px] min-w-11 cursor-pointer border border-foreground px-3 py-[6px] uppercase leading-none tracking-[0.08em] focus-visible:outline-offset-2";
/*
 * The button of the theme shown is filled with ink, the other is the page with ink words. Both
 * are written out for each theme, under `dark:` for one of them: which is shown is CSS's to say,
 * since the server does not know the theme.
 */
const DAY_BUTTON = `${THEME_BUTTON} bg-foreground text-background dark:bg-transparent dark:text-foreground dark:hover:bg-muted`;
const NIGHT_BUTTON = `${THEME_BUTTON} text-foreground hover:bg-muted dark:bg-foreground dark:text-background dark:hover:bg-foreground`;

/**
 * The theme: Day and Night, the one shown filled, at the end of the dateline strip at every
 * width. The values are next-themes' `light` and `dark`. Until a button is first pressed the
 * site follows the operating system; after that the choice is remembered. `aria-pressed` says
 * which is shown once the browser knows.
 */
export function ThemeControl() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is the browser's to know: the server and the first render say nothing of it.
  const known = useHydrated();
  const pressed = (theme: string) => (known ? resolvedTheme === theme : undefined);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset is for a form's fields.
    <div role="group" aria-label="Theme" className="flex gap-1 justify-self-end">
      <button
        type="button"
        aria-pressed={pressed("light")}
        onClick={() => setTheme("light")}
        className={DAY_BUTTON}
      >
        Day
      </button>
      <button
        type="button"
        aria-pressed={pressed("dark")}
        onClick={() => setTheme("dark")}
        className={NIGHT_BUTTON}
      >
        Night
      </button>
    </div>
  );
}
