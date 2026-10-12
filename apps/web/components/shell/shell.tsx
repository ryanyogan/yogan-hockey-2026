import type { SeasonRecord } from "@yogan-hockey/schemas";
import type { ReactNode } from "react";
import { Masthead } from "./masthead";
import { ScoreTickerSlot } from "./score-ticker-slot";
import { SiteFooter } from "./site-footer";

/**
 * The frame around every page: one column, at most 1320px wide with a gutter either side (24px,
 * 16 on a phone), holding the masthead, the score strip on the pages that have one, the page and
 * the footer. There is no sidebar and no bar fixed to an edge of the screen.
 *
 * The column's own padding is the gutter and the room the notch and the home bar take, so a page
 * adds none: its sections run from gutter to gutter.
 */
export function Shell({
  record,
  children,
}: {
  record: SeasonRecord | null;
  children: ReactNode;
}) {
  return (
    <div
      data-slot="page"
      className="mx-auto flex min-h-screen max-w-[1320px] flex-col pt-(--safe-top) pr-[calc(1rem+var(--safe-right))] pb-[calc(3rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] md:pr-[calc(1.5rem+var(--safe-right))] md:pl-[calc(1.5rem+var(--safe-left))]"
    >
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <Masthead record={record} />
      <ScoreTickerSlot />
      {/* A page's top-level sections are spaced by the shell, the first 28px under the masthead. */}
      <main id="content" tabIndex={-1} className="flex-1 space-y-8 pt-[22px] md:pt-7">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
