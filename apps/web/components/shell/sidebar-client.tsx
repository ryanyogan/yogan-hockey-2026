"use client";

import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense } from "react";
import { slateDay } from "../../lib/game-time";
import { currentNavItem, NAV_ITEMS, type NavItem, navItemByPathAlone } from "../../lib/nav";
import { type SlateCounts, slateCounts } from "../../lib/scoreboard-view";
import { useHydrated } from "../../lib/use-hydrated";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import {
  SIDEBAR_ACTION,
  SIDEBAR_BLOCK,
  SIDEBAR_FOCUS,
  SIDEBAR_ROW,
  SidebarHeading,
  TONIGHT_COLUMNS,
} from "./sidebar-parts";

/*
 * The parts of the sidebar that the browser must draw: the places (the path), today's slate (the
 * Scoreboard) and the theme. They are one file so that they are one script: each is a few hundred
 * bytes, and a file of its own costs about as much again on every page.
 */

function Places({ current }: { current: NavItem | undefined }) {
  return NAV_ITEMS.map((item, index) => {
    const here = item === current;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={here ? "page" : undefined}
        className={`${SIDEBAR_ROW} ${here ? `border-primary ${SIDEBAR_BLOCK}` : `text-note ${SIDEBAR_ACTION}`}`}
      >
        <span aria-hidden="true" className={`w-6 font-quiet ${here ? "" : "text-aside"}`}>
          {index + 1}
        </span>
        {item.label}
      </Link>
    );
  });
}

function PlacesByQuery() {
  return <Places current={currentNavItem(usePathname(), useSearchParams().get("tab"))} />;
}

function PlacesByPath() {
  return <Places current={navItemByPathAlone(usePathname())} />;
}

/**
 * The site's places as numbered rows, as a ledger ranks its rows; the current one is a solid
 * block. A client component only to know the address.
 *
 * As `NavLinks` does for the phone's tab bar, the rows are drawn at once from the path and again
 * when the query string is known: reading it suspends while the server renders.
 */
export function SidebarNav() {
  return (
    <Suspense fallback={<PlacesByPath />}>
      <PlacesByQuery />
    </Suspense>
  );
}

const TONIGHT_ROW = `${SIDEBAR_ROW} justify-between`;

function Count({ value }: { value: number | undefined }) {
  if (value == null) return null;
  return <span className={value === 0 ? "font-quiet text-aside" : "font-strong"}>{value}</span>;
}

/**
 * Where today's games stand, a count to a row: in progress, to come, over. `counts` is null
 * while the Scoreboard has not been read, and the rows then hold their room with no figures.
 * A postponed game gets a row only on a day that has one; nothing sits under it to be moved.
 */
export function TonightRows({ counts }: { counts: SlateCounts | null }) {
  const live = counts != null && counts.live > 0;
  return (
    <>
      <span className={`${TONIGHT_ROW} ${live ? "bg-live-tint text-foreground" : ""}`}>
        {live ? <LiveMarker strong /> : "live"}
        <Count value={counts?.live} />
      </span>
      <span className={TONIGHT_ROW}>
        to come
        <Count value={counts?.upcoming} />
      </span>
      <span className={TONIGHT_ROW}>
        final
        <Count value={counts?.final} />
      </span>
      {counts != null && counts.postponed > 0 && (
        <span className={TONIGHT_ROW}>
          postponed
          <Count value={counts.postponed} />
        </span>
      )}
    </>
  );
}

/**
 * Today's slate at a glance, current without a refresh: the day, and how many games are in
 * progress, to come and over. The rows are one link to the scores. It reads the page's one
 * Scoreboard socket through `useScoreboard()`, so it sits inside a `ScoreboardGate`.
 */
export function SidebarTonight() {
  const { date, games } = useScoreboard();
  // A Scoreboard that could not be read has no slate: the rows stay, with nothing to count.
  const counts = date == null ? null : slateCounts(games);
  return (
    <>
      <SidebarHeading title="Tonight" columns={TONIGHT_COLUMNS}>
        {date != null && slateDay(date)}
      </SidebarHeading>
      <Link href="/nhl/live" className={`block text-note ${SIDEBAR_ACTION}`}>
        <span className="sr-only">Tonight's scores: </span>
        <TonightRows counts={counts} />
      </Link>
    </>
  );
}

const THEME_CELL = `${SIDEBAR_FOCUS} h-10 flex-1 cursor-pointer border-rule font-label text-small uppercase tracking-label`;
/*
 * The cell of the theme shown is a solid block, as the current place is, and the other is idle.
 * Both are written out for each theme (`SIDEBAR_BLOCK` and `SIDEBAR_ACTION`, under `dark:` for
 * one of them): which is shown is CSS's to say, since the server does not know the theme.
 */
const LIGHT_CELL =
  "bg-primary text-primary-foreground focus-visible:ring-background dark:bg-transparent dark:text-note dark:hover:bg-highlight dark:hover:text-foreground dark:focus-visible:ring-ring";
const DARK_CELL =
  "text-note hover:bg-highlight hover:text-foreground focus-visible:ring-ring dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:focus-visible:ring-background";

/**
 * The theme, as a ruled strip of two cells with the one shown filled in. Until a cell is first
 * pressed the site follows the operating system; after that the choice is remembered.
 * `aria-pressed` says which is shown once the browser knows.
 */
export function SidebarTheme({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is the browser's to know: the server and the first render say nothing of it.
  const known = useHydrated();
  const pressed = (theme: string) => (known ? resolvedTheme === theme : undefined);
  return (
    <div className={className}>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset is for a form's fields. */}
      <div role="group" aria-label="Theme" className="flex border-rule border-t pb-(--safe-bottom)">
        <button
          type="button"
          aria-pressed={pressed("light")}
          onClick={() => setTheme("light")}
          className={`${THEME_CELL} ${LIGHT_CELL}`}
        >
          light
        </button>
        <button
          type="button"
          aria-pressed={pressed("dark")}
          onClick={() => setTheme("dark")}
          className={`${THEME_CELL} border-l ${DARK_CELL}`}
        >
          dark
        </button>
      </div>
    </div>
  );
}
