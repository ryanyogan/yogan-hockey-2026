import { Suspense } from "react";
import { NAV_ITEMS } from "../../lib/nav";
import { Link } from "../link";
import { ScoreboardGate } from "../scoreboard/scoreboard-provider";
import { SidebarNav, SidebarTheme, SidebarTonight, TonightRows } from "./sidebar-client";
import { SIDEBAR_ROW_PX, SidebarHeading, TONIGHT_COLUMNS } from "./sidebar-parts";

/** The places' column headers: the number sits over the rows' own, as a ledger's rank does. */
const NAV_COLUMNS = [
  <span key="page">
    <span className="inline-block w-6">#</span>page
  </span>,
] as const;

/**
 * The desktop sidebar: the wordmark, the site's places, today's slate at a glance and the theme.
 * It is one screen tall and stays put while the page scrolls; a window too short for it scrolls
 * it inside itself. The rule down its right side is the content column's (see `Shell`).
 *
 * Only what must know the path, the Scoreboard or the theme is a client component.
 */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[calc(12rem+var(--safe-left))] shrink-0 flex-col overflow-y-auto pt-(--safe-top) pl-(--safe-left) [scrollbar-width:none] md:flex">
      {/* As tall as the score strip beside it, rule included, so the two rules are one line. */}
      <div data-slot="sidebar-head" className="flex h-9 shrink-0 border-rule border-b">
        <Link
          href="/"
          className="flex flex-1 items-center px-4 font-strong text-wordmark outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          YOGAN/HOCKEY
        </Link>
      </div>
      {/* 24px under the strip's rule, where the page's first section header begins. */}
      <nav aria-label="Site" className="mt-6 shrink-0">
        <SidebarHeading title="Site" columns={NAV_COLUMNS} />
        {/* Reading the query string suspends during a static render; the rows keep their room. */}
        <div style={{ minHeight: NAV_ITEMS.length * SIDEBAR_ROW_PX }}>
          <Suspense>
            <SidebarNav />
          </Suspense>
        </div>
      </nav>
      <div className="mt-8 shrink-0">
        <ScoreboardGate
          fallback={
            <>
              <SidebarHeading title="Tonight" columns={TONIGHT_COLUMNS} />
              <TonightRows counts={null} />
            </>
          }
        >
          <SidebarTonight />
        </ScoreboardGate>
      </div>
      <SidebarTheme className="mt-auto shrink-0 pt-8" />
    </aside>
  );
}
