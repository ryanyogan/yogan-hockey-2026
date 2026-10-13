import type { SeasonRecord } from "@yogan-hockey/schemas";
import { useTheme } from "next-themes";
import { type ReactNode, useRef } from "react";
import { dateline, datelineDate } from "../../lib/agate-copy";
import { currentNavItem, NAV_ITEMS, type NavItem, showsScoreStrip } from "../../lib/nav";
import { useHydrated } from "../../lib/use-hydrated";
import { usePathname, useSearchParam } from "../../lib/use-page-address";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { wordmark } from "./wordmark";

/*
 * The parts of the masthead that the browser must draw: the sections (the path), the dateline and
 * the date (the Scoreboard), the theme, and whether the page has a score strip (the path).
 * They are one file so that they are one script: each is a few hundred bytes, and a file of its
 * own costs about as much again on every page.
 */

/*
 * What marks a cell of the sections' bar, a section or a theme: a 3px segment of rule along its
 * foot, on the bar's own rule. It is always there, clear until it is wanted, so marking a cell
 * moves nothing. The 3px above the word keep it in the middle of the 44px.
 */
const CELL =
  "relative inline-flex min-h-11 items-center border-transparent border-b-[3px] pt-[3px] font-semibold uppercase leading-none focus-visible:outline-offset-[-2px]";
/* The hairline between a cell and the one before it, at a desk. */
const DIVIDER =
  "md:before:absolute md:before:top-[calc(50%-5px)] md:before:left-0 md:before:h-[13px] md:before:border-border md:before:border-l";

/**
 * A section: 14px semibold capitals tracked at .14em, 44px to press. The current one is in the
 * one red and so is its segment; the one under the pointer has an ink segment.
 *
 * On a phone the cells share the bar's width, each as wide as its word and an even part of what
 * is left and never under 44px, at 13px and .06em with 3px either side, which fits the six on a
 * 390px phone. Below 390px they go a size down, 12px at .04em with 2px either side, and the six
 * fit a 360px one (at 13px they are 350px, 7px more than a 375px phone's bar). That width is
 * written `24.375rem`, in the unit of `max-md`: Tailwind orders two `max-` rules only when their
 * units are the same, and in px this one lost to `max-md`.
 */
const SECTION = `${CELL} px-[18px] text-[14px] tracking-[0.14em] md:not-first:before:absolute md:not-first:before:top-[calc(50%-5px)] md:not-first:before:left-0 md:not-first:before:h-[13px] md:not-first:before:border-border md:not-first:before:border-l hover:[&:not([aria-current])]:border-rule aria-[current=page]:border-kicker aria-[current=page]:text-kicker max-md:min-w-11 max-md:flex-[1_0_auto] max-md:justify-center max-md:px-[3px] max-md:text-[13px] max-md:tracking-[0.06em] max-[24.375rem]:px-[2px] max-[24.375rem]:text-[12px] max-[24.375rem]:tracking-[0.04em]`;

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
    <Tag data-slot="wordmark" className={`mt-[18px] md:mt-8 ${wordmark}`}>
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

/** The dateline's one line of type: two parts, one at each end, at a desk; one on a phone. */
const DATELINE_LINE =
  "flex flex-wrap gap-x-6 gap-y-1.5 py-[9px] font-medium text-[12px] text-note uppercase leading-[1.3] tracking-[0.06em] md:justify-between md:py-2 md:text-[13px] md:text-foreground";

/**
 * The dateline's line between the double rule (3px, a 2px gap, 1px) and the rule under it, around
 * whatever is written on it. On a phone the line is over a hairline and ends with the theme's one
 * button, which makes it 44px tall.
 *
 * With no children it holds the line's height, so nothing under it moves when the words arrive.
 */
function DatelineFrame({ children }: { children?: ReactNode }) {
  return (
    <div data-slot="dateline" className="mt-3 border-rule border-t-[3px] pt-[2px] md:mt-5">
      <div className="flex items-center justify-between gap-x-2 border-rule border-y max-md:border-b-rule-head md:block">
        <p className={DATELINE_LINE}>{children ?? <span aria-hidden="true">&nbsp;</span>}</p>
        <ThemeControl className="flex md:hidden" />
      </div>
    </div>
  );
}

/**
 * The dateline, current without a refresh: where tonight's games stand, and the season's record
 * of the picks. The sentences are `dateline()`'s. It reads the page's one
 * Scoreboard socket through `useScoreboard()`.
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

/**
 * The slate's date, "Sunday, October 11": the first part of the sections' bar, or the line under
 * the wordmark where the bar has no room. Before the Scoreboard's first poll it holds the line's
 * height.
 */
export function MastheadDate() {
  return datelineDate(useScoreboard().date) ?? "\u00a0";
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
 * A theme's button. From `md` up: a cell of the sections' bar with its word, a hairline between
 * the two. On a phone: its icon alone in a 44px square, the word kept for a screen reader.
 */
const THEME_BUTTON = `${CELL} cursor-pointer gap-1.5 px-[14px] text-[12px] tracking-[0.14em] max-md:w-11 max-md:justify-center max-md:border-b-0 max-md:px-0 max-md:pt-0`;
/*
 * The button of the theme shown is in ink over an ink segment, the other in the label's grey
 * until the pointer is on it. On a phone the one shown is the one not drawn: the phone has one
 * button, which leads to the other theme (a moon by day, a sun by night). Both are written out
 * for each theme, under `dark:` for one of them: which is shown is CSS's to say, since the server
 * does not know the theme.
 */
const DAY_BUTTON =
  "max-md:hidden md:border-rule dark:max-md:inline-flex dark:md:border-transparent dark:md:text-label dark:md:hover:text-foreground";
const NIGHT_BUTTON = `${DIVIDER} md:text-label md:hover:text-foreground dark:max-md:hidden dark:md:border-rule dark:md:text-foreground`;

/**
 * The theme: Day and Night, the one shown marked; on a phone, one icon button that switches
 * to the other. The values are next-themes' `light` and `dark`. Until a button is first pressed
 * the site follows the operating system; after that the choice is remembered. `aria-pressed`
 * says which is shown once the browser knows.
 *
 * The masthead writes it twice, for where each width has room (`masthead.tsx`): `className` says
 * at which widths this one is drawn.
 */
export function ThemeControl({ className }: { className: string }) {
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
    <div role="group" aria-label="Theme" className={`max-md:-mr-2.5 ${className}`}>
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
