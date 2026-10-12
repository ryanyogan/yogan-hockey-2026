/*
 * What Home adds to the Agate primitives (`packages/ui`) to be the prototype's Home to the pixel
 * (`prototypes/agate/style.css`, measured by `scripts/agate-home-compare.mjs`). The label, the
 * mark, the agate table, the conference control, the live dot and the focus ring are the
 * primitives'; these are the few classes Home puts beside them.
 *
 * The prototype sets most of its type with the `font` shorthand, which puts the figures back to
 * proportional ones; only what inherits the page's type (a table's cells, a brief, the TV line)
 * has tabular figures. `normal-nums` says the same here.
 */
import { focusRing } from "@yogan-hockey/ui/components/nav-item";
import { sectionLabel, sectionRule } from "@yogan-hockey/ui/components/section";
import { fitted } from "../story/type";

/** The red label over a section: "NHL Roundup", "The Picks". */
export const label = `${sectionLabel} normal-nums`;

/** A label that is also its section's top line: an ink rule beneath it. */
export const ruledLabel = `${label} ${sectionRule}`;

/** A link of Home's: the primitives' ring when the keyboard is on it. */
export const link = focusRing;

/** The link at the right-hand end of a section's head: "Full standings". A thumb's height. */
const moreLink = `inline-flex min-h-11 items-center font-label uppercase normal-nums leading-none tracking-head underline underline-offset-2 hover:text-label ${focusRing}`;
export const more = `${moreLink} text-small`;
/** The same beside a label, where it is the label's size. */
export const smallMore = `${moreLink} text-tag`;

/**
 * Beside a `Ledger`'s parts on Home: a story's own (`fitted`, which says why), and the standings'
 * columns of figures.
 */
export const agate = { ...fitted, figure: "w-[34px]" };
