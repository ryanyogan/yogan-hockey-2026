import type { ReactNode } from "react";

/*
 * The sidebar's parts, in the ledger's own terms. Everything starts 16px in (`px-4`) and every
 * rule runs the sidebar's whole width, to meet the rule the content column draws beside it.
 */

/** A row: a ledger row's line and padding. */
export const SIDEBAR_ROW = "flex items-center border-border border-b px-4 py-row";
/** The keyboard's focus, drawn inside the box: the sidebar's edges would cut a ring around it. */
export const SIDEBAR_FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-inset";
/** Something idle that can be followed or pressed: the pointer's highlight, as a ledger row's. */
export const SIDEBAR_ACTION = `${SIDEBAR_FOCUS} hover:bg-highlight hover:text-foreground focus-visible:ring-ring`;
/** The solid block: the current place, the theme shown. Its focus ring is the page's colour. */
export const SIDEBAR_BLOCK = `${SIDEBAR_FOCUS} bg-primary font-label text-primary-foreground focus-visible:ring-background`;

/**
 * The column headers over the slate's rows: the scores' own first column, and what is counted.
 * Here, not beside the rows, so the server can draw them while the rows wait for the Scoreboard.
 */
export const TONIGHT_COLUMNS = ["status", "games"] as const;

/**
 * The two lines above a block's rows, as a page's ledger has them: a section header's title, with
 * `children` as the quiet aside at its end, then the column headers on their heavier rule. The
 * column headers are for the eye: what the rows are is said by the rows themselves.
 */
export function SidebarHeading({
  title,
  columns,
  children,
}: {
  title: string;
  columns: readonly [first: ReactNode, last?: ReactNode];
  children?: ReactNode;
}) {
  return (
    <>
      <div className="mb-2 flex items-baseline justify-between gap-2 px-4">
        {/* Not a heading: it would come before the page's own first heading. */}
        <p className="font-strong uppercase">{title}</p>
        {children != null && (
          <span className="whitespace-nowrap font-quiet text-label text-small">{children}</span>
        )}
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between border-rule-head border-b px-4 py-1 font-label text-label text-small uppercase tracking-label"
      >
        <span>{columns[0]}</span>
        <span>{columns[1]}</span>
      </div>
    </>
  );
}
