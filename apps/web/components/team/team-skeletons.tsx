import { SectionSkeleton } from "@yogan-hockey/ui/components/skeleton";

/**
 * The team page's placeholders. Each repeats the columns of the ledger it stands in for (their
 * `numeric`, their `className`, the ledger's `density`), which is what makes it the same size:
 * change a ledger's columns and change them here.
 */

/** A list whose length is not known until it is read: enough rows to pass the window's foot. */
const ROWS_PAST_THE_FOLD = 24;

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
    <div className="grid gap-8 xl:grid-cols-2">
      <SectionSkeleton
        title="Upcoming"
        density="compact"
        rows={ROWS_PAST_THE_FOLD}
        columns={[
          { width: "md" },
          { width: "lg", className: "w-full" },
          { width: "md", numeric: true },
        ]}
      />
      <SectionSkeleton
        title="Results"
        density="compact"
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
    <div className="grid gap-8 xl:grid-cols-2">
      <SectionSkeleton
        title="Roster"
        density="compact"
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
