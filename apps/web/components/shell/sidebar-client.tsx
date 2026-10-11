"use client";

import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { slateDay } from "../../lib/game-time";
import { currentNavItem, NAV_ITEMS } from "../../lib/nav";
import { type SlateCounts, slateCounts, slateCountsLine } from "../../lib/scoreboard-view";
import { Link } from "../link";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import {
  SIDEBAR_ACTION,
  SIDEBAR_BLOCK,
  SIDEBAR_ROW,
  SidebarHeading,
  TONIGHT_COLUMNS,
} from "./sidebar-parts";

/*
 * The parts of the sidebar that the browser must draw: the places (the path), today's slate (the
 * Scoreboard) and the theme. They are one file so that they are one script: each is a few hundred
 * bytes, and a file of its own costs about as much again on every page.
 */

/**
 * The site's places as numbered rows, as a ledger ranks its rows; the current one is a solid
 * block. A client component only to know the path.
 */
export function SidebarNav() {
  const current = currentNavItem(usePathname(), useSearchParams().get("tab"));
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

const ROW = `${SIDEBAR_ROW} justify-between`;

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
      <span className={`${ROW} ${live ? "bg-live-tint text-foreground" : ""}`}>
        {live ? <LiveMarker strong /> : "live"}
        <Count value={counts?.live} />
      </span>
      <span className={ROW}>
        to come
        <Count value={counts?.upcoming} />
      </span>
      <span className={ROW}>
        final
        <Count value={counts?.final} />
      </span>
      {counts != null && counts.postponed > 0 && (
        <span className={ROW}>
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
      <Link
        href="/nhl/live"
        aria-label={counts == null ? "Scores" : `Scores: ${slateCountsLine(counts)}`}
        className={`block text-note ${SIDEBAR_ACTION}`}
      >
        <TonightRows counts={counts} />
      </Link>
    </>
  );
}

// The theme is the browser's to know: the server and the first render say nothing of it.
const never = () => () => {};

const CELL =
  "h-10 flex-1 cursor-pointer border-rule font-label text-small uppercase tracking-label outline-none focus-visible:ring-2 focus-visible:ring-inset";
/*
 * The cell of the theme shown is a solid block, as the current place is, and the other is idle.
 * Both are written out for each theme (`SIDEBAR_BLOCK` and `SIDEBAR_ACTION`, under `dark:` for
 * one of them): which is shown is CSS's to say, since the server does not know the theme.
 */
const LIGHT =
  "bg-primary text-primary-foreground focus-visible:ring-background dark:bg-transparent dark:text-note dark:hover:bg-highlight dark:hover:text-foreground dark:focus-visible:ring-ring";
const DARK =
  "text-note hover:bg-highlight hover:text-foreground focus-visible:ring-ring dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:focus-visible:ring-background";

/**
 * The theme, as a ruled strip of two cells with the one shown filled in. Until a cell is first
 * pressed the site follows the operating system; after that the choice is remembered.
 * `aria-pressed` says which is shown once the browser knows.
 */
export function SidebarTheme({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const known = useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
  const pressed = (theme: string) => (known ? resolvedTheme === theme : undefined);
  return (
    <div className={className}>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset is for a form's fields. */}
      <div role="group" aria-label="Theme" className="flex border-rule border-t pb-(--safe-bottom)">
        <button
          type="button"
          aria-pressed={pressed("light")}
          onClick={() => setTheme("light")}
          className={`${CELL} ${LIGHT}`}
        >
          light
        </button>
        <button
          type="button"
          aria-pressed={pressed("dark")}
          onClick={() => setTheme("dark")}
          className={`${CELL} border-l ${DARK}`}
        >
          dark
        </button>
      </div>
    </div>
  );
}
