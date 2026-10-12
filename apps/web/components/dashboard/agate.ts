/*
 * Home's share of the Agate look (`docs/design/agate.md`), as class lists: the red label, the
 * "more" link, the mark, and an agate table's cells. Each is the prototype's rule of the same
 * name (`prototypes/agate/style.css`), measured against it by `scripts/agate-home-compare.mjs`.
 *
 * The prototype sets most of its type with the `font` shorthand, which puts the figures back to
 * proportional ones; only what inherits the page's type (a table's cells, a brief, the TV line)
 * has tabular figures. `normal-nums` says the same here.
 */

/** The red label over a section: "NHL Roundup", "The Picks". */
export const label =
  "font-bold text-[12px] text-kicker uppercase normal-nums leading-[1.3] tracking-[0.16em]";

/** A label that is also its section's top line: an ink rule beneath it. */
export const ruledLabel = `${label} border-rule border-b pb-[6px]`;

/** The link at the right-hand end of a section's head: "Full standings". A thumb's height. */
const moreLink =
  "inline-flex min-h-11 items-center font-semibold uppercase normal-nums leading-none tracking-[0.1em] underline underline-offset-2 hover:text-label";
export const more = `${moreLink} text-[13px]`;
/** The same beside a label, where it is the label's size. */
export const smallMore = `${moreLink} text-[12px]`;

/** Right (filled) or Wrong (outlined), beside a pick. */
export const mark =
  "ml-1 inline-block whitespace-nowrap border border-rule px-[6px] py-[3px] font-agate font-bold text-[12px] uppercase not-italic normal-nums leading-none tracking-[0.12em] data-[outcome=right]:bg-foreground data-[outcome=right]:text-background";

/** An agate table and its parts. A row is a `group`, so its cells can tell the last and the hovered. */
export const agate = {
  table: "w-full border-collapse",
  row: "group",
  /** A column's head: 11px capitals over a hairline, to the right but for the first. */
  head: "border-rule-head border-b py-[5px] text-right font-bold text-[11px] text-label uppercase normal-nums leading-[1.2] tracking-[0.1em] first:text-left",
  /** A figure, or a name in the first column, over a dotted rule. */
  cell: "border-border border-b border-dotted py-[5px] text-right text-[15px] first:text-left group-last:border-b-0 group-hover:bg-highlight",
  /** The team a row is about, where the row has a header of its own. Give it a weight. */
  rowHead:
    "border-border border-b border-dotted py-[6px] text-left text-[16px] text-foreground normal-nums leading-[1.45] group-last:border-b-0",
  /** A column of figures. */
  figure: "w-[34px]",
};
