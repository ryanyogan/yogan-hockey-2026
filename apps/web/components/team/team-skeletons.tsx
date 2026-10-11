import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { LedgerSkeleton, SectionSkeleton } from "@yogan-hockey/ui/components/skeleton";
import type { ReactNode } from "react";
import { GAME_COLUMNS, SLATE_TABLE } from "../slate-skeleton";

/** All states occupy the live ledger's geometry, including when there is no next game. */
export function TeamNowFrame({ children }: { children: ReactNode }) {
  return (
    <div data-slot="team-now" className="grid grid-cols-1">
      <div aria-hidden="true" className="invisible col-start-1 row-start-1 pointer-events-none">
        <Section>
          <SectionHeader title="Playing now" />
          <LedgerSkeleton
            className={`table-fixed ${SLATE_TABLE}`}
            columns={GAME_COLUMNS}
            rows={1}
          />
        </Section>
      </div>
      <div className="col-start-1 row-start-1">{children}</div>
    </div>
  );
}

/**
 * The team page's placeholders. Each repeats the columns of the ledger it stands in for (their
 * `numeric`, their `className`), which is what makes it the same size:
 * change a ledger's columns and change them here.
 */

/** A list whose length is not known until it is read: a short preview rather than duplicating a whole table in the response. */
const ROWS_PAST_THE_FOLD = 8;

/** `TeamNow`'s Next Game card (`team-now.tsx`): one row, always. */
export function NextGameSkeleton() {
  return (
    <SectionSkeleton
      title="Next game"
      rows={1}
      columns={[
        { width: "md" },
        { width: "md" },
        { width: "md", className: "w-full sm:w-auto" },
        { width: "lg", className: "w-full max-sm:hidden" },
      ]}
    />
  );
}

/** The Schedule tab: `UpcomingLedger` beside `ResultsLedger` (`schedule-ledgers.tsx`). */
export function ScheduleSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <SectionSkeleton
        title="Upcoming"
        rows={ROWS_PAST_THE_FOLD}
        columns={[
          { width: "md" },
          { width: "lg", className: "w-full" },
          { width: "md", numeric: true },
        ]}
      />
      <SectionSkeleton
        title="Results"
        rows={ROWS_PAST_THE_FOLD}
        columns={[
          { width: "md" },
          { width: "lg", className: "w-full" },
          { width: "xs" },
          { width: "sm", numeric: true },
        ]}
      />
    </div>
  );
}

/** The Roster tab: `RosterLedger` with its column of hearts (`roster-ledger.tsx`). */
export function RosterSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <SectionSkeleton
        title="Roster"
        rows={ROWS_PAST_THE_FOLD}
        columns={[
          { width: "xs", numeric: true, className: "min-w-8" },
          { width: "lg", className: "w-full" },
          { width: "xs" },
          { width: "xs" },
        ]}
      />
    </div>
  );
}

/** The Stats tab: `TeamStatsLedger`'s one row of eight figures (`team-stats-ledger.tsx`). */
export function TeamStatsSkeleton() {
  return (
    <SectionSkeleton
      title="Season stats"
      rows={1}
      columns={[
        ...Array.from({ length: 8 }, () => ({ width: "sm" as const, numeric: true })),
        { width: "xs", className: "w-full p-0" },
      ]}
    />
  );
}
