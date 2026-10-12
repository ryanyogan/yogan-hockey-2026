import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerDetail,
  LedgerHead,
  LedgerRow,
} from "./ledger";

/**
 * A ledger with a bar where each value would be, drawn from the ledger's own parts so that it
 * takes exactly the room of the real one. No page waits behind one: a route's loader reads
 * everything the page draws (ADR 0009). What is left is holding a ledger's place unseen, as the
 * team page does for its game (`TeamNowFrame` in `apps/web`).
 *
 * The rule that keeps it exact: give `columns` the real ledger's columns, with the same `numeric`
 * and the same `className` (the `w-full` that takes the slack, a `max-sm:hidden`). A row is then
 * the real row's height by construction, whatever the tokens become.
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
      // Its shape is in `theme.css`, under this slot's name: only the width is said here.
      className={cn(barWidth[width], className)}
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
  /** Classes the real ledger gives the column's cells and not its header: a cell's own padding. */
  cellClassName?: string;
  /** A second line under the value, as `LedgerDetail` draws; `"fine"` for its small print. */
  detail?: boolean | "fine";
};

/** A ledger of placeholder rows, hidden from a screen reader. */
function LedgerSkeleton({
  columns,
  rows,
  className,
}: {
  columns: readonly SkeletonColumn[];
  rows: number;
  className?: string;
}) {
  return (
    <Ledger className={className} aria-hidden="true" data-skeleton="">
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
              <LedgerCell
                // biome-ignore lint/suspicious/noArrayIndexKey: as above
                key={index}
                numeric={column.numeric}
                className={cn(column.className, column.cellClassName)}
              >
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

export { LedgerSkeleton, SkeletonBar, type SkeletonColumn };
