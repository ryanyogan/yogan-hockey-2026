import { cn } from "cn";
import type { ComponentProps } from "react";

/**
 * The ledger: the one dense table every subject on the site is drawn with (tonight's games,
 * standings, rosters, career stats). No cards and no team logos.
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
  /** `compact` is for long reference tables such as standings: 4px less per row. */
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
        "border-foreground/20 border-b px-2 py-1 font-normal text-[10px] text-foreground/50 uppercase tracking-wider",
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
        "relative border-b",
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
  note: "text-foreground/70",
  /** An aside, such as a rank. */
  aside: "text-foreground/40",
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
        "px-2 py-1.5 group-data-[density=compact]/ledger:py-1",
        (numeric || tone === "score") && "text-right tabular-nums",
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
      className={cn("whitespace-nowrap text-foreground/40", className)}
      {...props}
    />
  );
}

/**
 * A second line under a cell's main value: a Tracked Player's next game under his team. `fine` is
 * small print for a narrow column, such as a game's venue under its status on a phone: it wraps,
 * and it keeps the room of two lines whatever it holds, so the rows of a table stay one height.
 */
function LedgerDetail({
  className,
  fine = false,
  ...props
}: ComponentProps<"div"> & { fine?: boolean }) {
  return (
    <div
      data-slot="ledger-detail"
      className={cn(
        fine
          ? "line-clamp-2 h-6 whitespace-normal text-[10px] text-foreground/50 leading-3"
          : "text-foreground/60",
        className,
      )}
      {...props}
    />
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
