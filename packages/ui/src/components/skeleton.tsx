import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerDetail,
  LedgerHead,
  LedgerRow,
} from "./ledger";
import { Section, SectionHeader } from "./section";

/**
 * Placeholders for content that is still being read, drawn from the ledger's own parts so that
 * each takes exactly the room of what replaces it: nothing on the page moves when it arrives.
 *
 *   // In a `loading.tsx`, or as a `<Suspense fallback>`:
 *   <SectionSkeleton
 *     title="Roster"
 *     rows={24}
 *     columns={[{ width: "sm" }, { width: "lg", className: "w-full" }, { width: "sm", numeric: true }]}
 *   />
 *
 * The rule that keeps it exact: a skeleton is the real component's markup with a `SkeletonBar`
 * where each value would be. Give `columns` the real ledger's columns, with the same `numeric`
 * and the same `className` (the `w-full` that takes the slack, a `max-sm:hidden`), and the same
 * `density`. A row is then the real row's height by construction (32.5px, compact 28.5px, and a
 * section's header line 23.5px), whatever the tokens become.
 *
 * What a skeleton cannot know is how many rows are coming. Where the number is fixed (a team's
 * record, a Next Game card) say it. Where it is not (a schedule, a roster), give enough rows to
 * reach past the bottom of the window (24), so whatever follows the list starts off screen and
 * its move is never seen.
 */

const barWidth = { xs: "w-4", sm: "w-8", md: "w-16", lg: "w-32", xl: "w-48" } as const;
type BarWidth = keyof typeof barWidth;

/**
 * One value's placeholder: a quiet bar on a line of text. It is an inline box holding a space,
 * so it is as tall as a line of whatever text it stands in for, and the bar is drawn inside it.
 */
function SkeletonBar({
  width = "md",
  className,
  ...props
}: ComponentProps<"span"> & { width?: BarWidth }) {
  return (
    <span
      data-slot="skeleton-bar"
      aria-hidden="true"
      className={cn(
        "relative inline-block max-w-full select-none align-baseline",
        "after:absolute after:inset-x-0 after:top-1/2 after:h-[0.6em] after:-translate-y-1/2 after:bg-foreground/10 after:content-['']",
        "motion-safe:after:animate-pulse",
        barWidth[width],
        className,
      )}
      {...props}
    >
      {" "}
    </span>
  );
}

type SkeletonColumn = {
  /** How wide the bar in each of the column's cells is. */
  width?: BarWidth;
  /** Right-aligned, as the real column is. */
  numeric?: boolean;
  /** The real column's classes: `w-full` on the one that takes the slack, `max-sm:hidden`. */
  className?: string;
  /** A second line under the value, as `LedgerDetail` draws; `"fine"` for its small print. */
  detail?: boolean | "fine";
};

/**
 * A ledger of placeholder rows. Hidden from a screen reader: the `SectionSkeleton` (or whatever
 * holds it) says that the content is loading, once.
 */
function LedgerSkeleton({
  columns,
  rows,
  density = "default",
  className,
}: {
  columns: readonly SkeletonColumn[];
  rows: number;
  density?: "default" | "compact";
  className?: string;
}) {
  return (
    <Ledger density={density} className={className} aria-hidden="true" data-skeleton="">
      <LedgerHead>
        {columns.map((column, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: columns have no other identity
          <LedgerColumn key={index} numeric={column.numeric} className={column.className}>
            <SkeletonBar width="xs" />
          </LedgerColumn>
        ))}
      </LedgerHead>
      <LedgerBody>
        {Array.from({ length: rows }, (_, row) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no other identity
          <LedgerRow key={row}>
            {columns.map((column, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: as above
              <LedgerCell key={index} numeric={column.numeric} className={column.className}>
                <SkeletonBar width={column.width} />
                {column.detail && (
                  <LedgerDetail fine={column.detail === "fine"}>
                    <SkeletonBar width="md" />
                  </LedgerDetail>
                )}
              </LedgerCell>
            ))}
          </LedgerRow>
        ))}
      </LedgerBody>
    </Ledger>
  );
}

/**
 * A whole section's placeholder: its header line and a `LedgerSkeleton`. Give `title` when the
 * heading is known before the data is (most are: "Upcoming", "Roster"), so the heading is
 * already the real one; leave it out for a heading that is data, such as a team's name.
 */
function SectionSkeleton({
  title,
  label = typeof title === "string" ? title : "content",
  children,
  ...ledger
}: ComponentProps<typeof LedgerSkeleton> & {
  title?: ReactNode;
  /** What is loading, for a screen reader: "Loading roster". Defaults to the title. */
  label?: string;
  /** Sits at the right end of the header line, as `SectionHeader`'s children do. */
  children?: ReactNode;
}) {
  return (
    <Section data-slot="section-skeleton" aria-busy="true">
      <SectionHeader title={title ?? <SkeletonBar width="xl" />}>{children}</SectionHeader>
      <span role="status" className="sr-only">
        Loading {label.toLowerCase()}
      </span>
      <LedgerSkeleton {...ledger} />
    </Section>
  );
}

export { LedgerSkeleton, SectionSkeleton, SkeletonBar, type SkeletonColumn };
