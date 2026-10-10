import { cn } from "cn";
import type { ComponentProps } from "react";

/**
 * The ledger: the one dense table every subject on the site is drawn with (tonight's games,
 * standings, rosters, career stats), within the shared boxed panels.
 *
 *   <Ledger>
 *     <LedgerHead>
 *       <LedgerColumn>team</LedgerColumn>
 *       <LedgerColumn numeric>pts</LedgerColumn>
 *     </LedgerHead>
 *     <LedgerBody>
 *       <LedgerRow live>
 *         <LedgerCell>TOR <LedgerAside>2-0-0</LedgerAside></LedgerCell>
 *         <LedgerCell numeric tone="strong">4</LedgerCell>
 *       </LedgerRow>
 *     </LedgerBody>
 *   </Ledger>
 */
function Ledger({
  className,
  density = "default",
  ...props
}: ComponentProps<"table"> & {
  /** `compact` is for long reference tables such as standings: 36px rows on desktop, 40px on phones. */
  density?: "default" | "compact";
}) {
  return (
    // A table wider than a phone scrolls sideways inside its own box; the page never does.
    // Positioned, so a `ledgerRowLink` can never stretch past its own table.
    <div data-slot="ledger" className="relative w-full overflow-x-auto">
      <table
        data-density={density}
        className={cn("group/ledger w-full border-collapse", className)}
        {...props}
      />
    </div>
  );
}

/** The header row. Its children are `LedgerColumn`s. */
function LedgerHead({ children, ...props }: ComponentProps<"thead">) {
  return (
    <thead data-slot="ledger-head" {...props}>
      <tr>{children}</tr>
    </thead>
  );
}

/**
 * A column header. Leave it empty over a column that needs no label, such as a score: it is then
 * a plain cell, since a header with no text names nothing.
 */
function LedgerColumn({
  className,
  numeric = false,
  ...props
}: ComponentProps<"th"> & { numeric?: boolean }) {
  const Cell = props.children == null ? "td" : "th";
  return (
    <Cell
      data-slot="ledger-column"
      scope={Cell === "th" ? "col" : undefined}
      className={cn(
        "h-8 border-rule border-b bg-muted px-2 py-1.5 font-normal text-xs text-muted-foreground",
        numeric ? "text-right" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

function LedgerBody(props: ComponentProps<"tbody">) {
  return <tbody data-slot="ledger-body" {...props} />;
}

function LedgerRow({
  className,
  live = false,
  interactive = false,
  cutoff = false,
  ...props
}: ComponentProps<"tr"> & {
  /** Tints the row: a game in progress. */
  live?: boolean;
  /** Highlights the row under the pointer: set it when the row holds a `ledgerRowLink`. */
  interactive?: boolean;
  /** Draws a heavier rule under the row: the last playoff place in the standings. */
  cutoff?: boolean;
}) {
  return (
    <tr
      data-slot="ledger-row"
      data-live={live ? "" : undefined}
      data-cutoff={cutoff ? "" : undefined}
      className={cn(
        "relative border-b last:border-b-0",
        live && "bg-live-tint",
        interactive && "hover:bg-highlight",
        cutoff && "border-b-foreground/50",
        className,
      )}
      {...props}
    />
  );
}

const cellTone = {
  default: "",
  /** The row's key figure, such as points. */
  strong: "font-bold",
  /** A score: larger than the row's text, and it does not add to the row's height. */
  score: "py-0! text-base font-bold",
  /** A note column, such as the pick. */
  note: "text-muted-foreground",
  /** An aside, such as a rank. */
  aside: "text-muted-foreground",
  /** A figure above zero, and one below it: a goal difference. */
  positive: "text-positive",
  negative: "text-negative",
} as const;

function LedgerCell({
  className,
  numeric = false,
  tone = "default",
  ...props
}: ComponentProps<"td"> & { numeric?: boolean; tone?: keyof typeof cellTone }) {
  return (
    <td
      data-slot="ledger-cell"
      className={cn(
        "h-11 px-2 py-2 group-data-[density=compact]/ledger:h-10 sm:group-data-[density=compact]/ledger:h-9",
        (numeric || tone === "score") && "text-right font-mono text-[13px] tabular-nums",
        cellTone[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Quieter text beside a cell's main value: a team's record after its abbreviation. */
function LedgerAside({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="ledger-aside"
      className={cn("whitespace-nowrap text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

/** A second line under a cell's main value. */
function LedgerDetail({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="ledger-detail" className={cn("text-muted-foreground", className)} {...props} />
  );
}

/**
 * Classes for the link that makes a whole row clickable: put them on the link in the row's first
 * cell and set `interactive` on the `LedgerRow`. The link's own text stays the accessible name.
 */
const ledgerRowLink = "after:absolute after:inset-0 after:content-['']";

export {
  Ledger,
  LedgerAside,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerDetail,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
};
