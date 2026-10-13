/*
 * The front page's type and rules (#240; `docs/design/front-page/Main.dc.html` is the artboard
 * these values are read from). Home is a broadsheet: nothing is boxed or filled, and every line
 * on it is one of three kinds.
 *
 *   `border-rule`      1px of ink: structure. Over and under the roundup, under a section's
 *                      head and a table's head, over The Picks and Tonight at a glance.
 *   `border-hairline`  1px of the quiet colour: between rows, and between columns.
 *   3px double         the masthead and the footer only (`components/shell`), never here.
 *
 * Every figure is tabular: the page's own type says so (`frontPage`), and nothing puts it back.
 */
import { focusRing } from "@yogan-hockey/ui/components/nav-item";

/** Home's own type: the serif at 16px on 1.45, with tabular figures. */
export const frontPage = "font-serif text-[16px] leading-[1.45] tabular-nums";

/** A link of Home's: the primitives' ring when the keyboard is on it. */
export const link = focusRing;

/** Small capitals in agate: a kicker, a label, a table's column heads. */
const caps = "font-agate text-[12px] uppercase leading-[1.35]";

/** The quiet label over a block or beside a section's title: "The Picks", "From ESPN". */
export const label = `${caps} tracking-[0.12em] text-muted-foreground`;

/** The red line over a written piece: what it is, and the day it is about. */
export const flag = `${caps} font-label tracking-[0.12em] text-kicker`;

/** A section's serif title: "Headlines", "Standings". */
export const sectionTitle = "font-serif font-strong text-[22px] leading-none";

/** The line a section's title sits on: an ink rule under it. */
export const sectionHead = "flex items-baseline gap-4 border-rule border-b pb-[10px]";

/** The quiet line beside a section's title, and the link at the far end of its head. */
export const sectionKicker = `${caps} tracking-[0.1em] text-muted-foreground`;

/**
 * A table in agate: a line score, a conference. Its head is small capitals over an ink rule, and
 * a hairline parts its rows.
 */
export const table = {
  table: "w-full border-collapse font-agate text-[15px] leading-[1.45]",
  head: "border-rule border-b text-[12px] text-muted-foreground uppercase tracking-[0.08em]",
  /** A column's head; `quiet` is every one but a table's key figure, which is bold and in ink. */
  column: "py-[5px]",
  quiet: "font-medium",
  key: "font-label text-foreground",
  row: "border-hairline border-b last:border-b-0",
  cell: "py-[5px]",
};

/** How many columns a row of stories is set in from `md` up: one for each, three at most. */
const GRID = ["", "", "md:grid-cols-2", "md:grid-cols-3"];

/**
 * A row of stories as ruled columns: an ink rule over and under, hairlines between. The grid
 * stretches every column to the tallest, so the row's floor is level whatever each one holds. On
 * a phone the columns are one above another, a hairline between.
 */
export const columns = (count: number) =>
  `grid border-rule border-y ${GRID[Math.min(count, 3)] ?? ""}`;

/**
 * One column of `columns(count)`, the `index`th: 20px above and below, 24px either side of a
 * hairline, and nothing outside the first and the last, which end on the page's own margins.
 */
export function column(index: number, count: number): string {
  const across = Math.min(count, 3);
  const place = index % across;
  return [
    "flex min-w-0 flex-col border-hairline py-5",
    index > 0 && "max-md:border-t",
    index >= across && "md:border-t",
    place > 0 && "md:border-l md:pl-6",
    place < across - 1 && "md:pr-6",
  ]
    .filter(Boolean)
    .join(" ");
}
