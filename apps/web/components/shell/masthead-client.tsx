"use client";

import type { SeasonRecord } from "@yogan-hockey/schemas";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, Suspense, useRef } from "react";
import { dateline, datelineDate } from "../../lib/agate-copy";
import {
  currentNavItem,
  NAV_ITEMS,
  type NavItem,
  navItemByPathAlone,
  showsScoreStrip,
} from "../../lib/nav";
import { useHydrated } from "../../lib/use-hydrated";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { wordmark } from "./wordmark";

/*
 * The parts of the masthead that the browser must draw: the sections (the path), the dateline and
 * the short date (the Scoreboard), the theme, and whether the page has a score strip (the path).
 * They are one file so that they are one script: each is a few hundred bytes, and a file of its
 * own costs about as much again on every page.
 */

/** A section: 13px semibold capitals, 44px to press, the current one in the one red. */
const SECTION =
  "inline-flex min-h-11 items-center font-semibold text-[13px] leading-none tracking-[0.1em] uppercase hover:text-label aria-[current=page]:text-kicker max-md:px-1.5";

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

function SectionsByQuery() {
  return <Sections current={currentNavItem(usePathname(), useSearchParams().get("tab"))} />;
}

function SectionsByPath() {
  return <Sections current={navItemByPathAlone(usePathname())} />;
}

/**
 * The wordmark, a link home. On Home it is the page's `h1`: Home draws no title of its own, and
 * the paper's name is what that page is. Anywhere else the page's title is the `h1` and this is a
 * paragraph, so every page has exactly one.
 */
export function Wordmark() {
  const Tag = usePathname() === "/" ? "h1" : "p";
  return (
    <Tag data-slot="wordmark" className={`mt-[18px] md:mt-7 ${wordmark}`}>
      <Link href="/">Yogan Hockey</Link>
    </Tag>
  );
}

/**
 * The site's five sections as links, the current one marked. A client component only to know the
 * address.
 *
 * Reading the query string suspends while the server renders, until it knows whether the page is
 * static, and what suspends is sent after the page. So the links are drawn at once from the path,
 * which settles the section everywhere but on `/nhl`, and again when the query is known.
 */
export function SectionLinks() {
  return (
    <Suspense fallback={<SectionsByPath />}>
      <SectionsByQuery />
    </Suspense>
  );
}

/** The dateline's one line of type: three parts across a desk, one centred on a phone. */
const DATELINE_LINE =
  "flex flex-wrap justify-center gap-x-6 gap-y-1.5 border-rule-head border-b py-[9px] font-medium text-[12px] text-note uppercase leading-[1.3] tracking-[0.06em] md:justify-between md:border-rule md:border-t md:border-b-0 md:py-2 md:text-[13px] md:text-foreground";

/**
 * The dateline's rules and its line, around whatever is written on it. From `md` up it is the
 * double rule under the wordmark (3px, then 1px) with a plain rule beneath; on a phone the double
 * rule is the section nav's, above it, and the line sits over a hairline.
 *
 * With no children it holds the line's height, so nothing under it moves when the words arrive.
 */
export function DatelineFrame({ children }: { children?: ReactNode }) {
  return (
    <div
      data-slot="dateline"
      className="border-rule md:mt-5 md:border-t-[3px] md:border-b md:pt-[3px]"
    >
      <p className={DATELINE_LINE}>{children ?? <span aria-hidden="true">&nbsp;</span>}</p>
    </div>
  );
}

/**
 * The dateline, current without a refresh: the date, where tonight's games stand, and the
 * season's record of the picks. The sentences are `dateline()`'s. It reads the page's one
 * Scoreboard socket through `useScoreboard()`, so it sits inside a `ScoreboardGate`.
 */
export function Dateline({ record }: { record: SeasonRecord | null }) {
  const { wide, narrow } = dateline(useScoreboard(), record);
  // A Scoreboard that could not be read has no slate: the rules stay, with nothing written.
  if (wide.length === 0) return <DatelineFrame />;
  return (
    <DatelineFrame>
      {wide.map((part) => (
        <span key={part} className="max-md:hidden">
          {part}
        </span>
      ))}
      <span className="md:hidden">{narrow}</span>
    </DatelineFrame>
  );
}

/** The slate's date in short, "Sun, Oct 11": the phone's utility bar. Inside a `ScoreboardGate`. */
export function ShortDate() {
  return datelineDate(useScoreboard().date, "short");
}

/** Whatever is drawn where the score strip goes, on the pages that have one: all but Home. */
export function ScoreStripPlace({ children }: { children: ReactNode }) {
  return showsScoreStrip(usePathname()) ? children : null;
}

const SUN = (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    className="md:hidden"
  >
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
);
const MOON = (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinejoin="round"
    className="md:hidden"
  >
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </svg>
);

/*
 * A theme's button. From `md` up: a ruled cell with its word, 44px tall. On a phone: its icon
 * alone in a 44px square, the word kept for a screen reader.
 */
const THEME_BUTTON =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 border border-rule px-3 font-semibold text-[12px] leading-none tracking-[0.12em] uppercase max-md:w-11 max-md:justify-center max-md:border-0 max-md:px-0";
/*
 * The button of the theme shown is filled in, and on a phone it is the one not drawn: the phone
 * has one button, which leads to the other theme (a moon by day, a sun by night). Both are
 * written out for each theme, under `dark:` for one of them: which is shown is CSS's to say,
 * since the server does not know the theme.
 */
const DAY_BUTTON =
  "max-md:hidden md:bg-foreground md:text-background dark:max-md:inline-flex dark:md:bg-transparent dark:md:text-foreground";
const NIGHT_BUTTON = "dark:max-md:hidden dark:md:bg-foreground dark:md:text-background";

/**
 * The theme: Day and Night, the one shown filled in; on a phone, one icon button that switches
 * to the other. The values are next-themes' `light` and `dark`. Until a button is first pressed
 * the site follows the operating system; after that the choice is remembered. `aria-pressed`
 * says which is shown once the browser knows.
 */
export function ThemeControl() {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is the browser's to know: the server and the first render say nothing of it.
  const known = useHydrated();
  const pressed = (theme: string) => (known ? resolvedTheme === theme : undefined);
  const day = useRef<HTMLButtonElement>(null);
  const night = useRef<HTMLButtonElement>(null);
  const show = (theme: "light" | "dark") => {
    setTheme(theme);
    // On a phone the button pressed is no longer drawn, and the focus would go with it.
    requestAnimationFrame(() => {
      const [was, other] = theme === "light" ? [day, night] : [night, day];
      if (was.current != null && was.current.offsetParent == null) other.current?.focus();
    });
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset is for a form's fields.
    <div role="group" aria-label="Theme" className="flex gap-1 max-md:-mr-2.5 max-md:self-stretch">
      <button
        ref={day}
        type="button"
        aria-pressed={pressed("light")}
        onClick={() => show("light")}
        className={`${THEME_BUTTON} ${DAY_BUTTON}`}
      >
        {SUN}
        <span className="max-md:sr-only">Day</span>
      </button>
      <button
        ref={night}
        type="button"
        aria-pressed={pressed("dark")}
        onClick={() => show("dark")}
        className={`${THEME_BUTTON} ${NIGHT_BUTTON}`}
      >
        {MOON}
        <span className="max-md:sr-only">Night</span>
      </button>
    </div>
  );
}
