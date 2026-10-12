/*
 * A story's type and rules, as the prototype sets them (`.story`, `.kicker`, `.headline`, `.deck`,
 * `.pick`, `.tv` in `prototypes/agate/style.css`), from the theme's tokens. A lead on Home and a
 * game page's header are both stories, and both take these, so the two cannot drift apart.
 *
 * The prototype sets each of these with the `font` shorthand, which puts the figures back to
 * proportional ones: `normal-nums`.
 */

/** The heavy rule a story opens under: ink, and the one red while its game is on (`data-live`). */
export const storyRule = "border-rule border-t-3 pt-3.5 data-live:border-live";

/** The red line above the headline: "Live · 3rd 18:44 · Scotiabank Arena". */
export const storyKicker =
  "font-label text-kicker text-tag uppercase normal-nums leading-[1.35] tracking-kicker";

/** A headline's face. Its optical size is a class, since a size's token cannot carry one. */
const headlineFace = "font-serif font-strong normal-nums [font-variation-settings:'opsz'_60]";

/** The serif headline. */
export const storyHeadline = `text-balance text-headline ${headlineFace}`;

/**
 * A club's name as its page's headline: one line on any screen, a little smaller than a headline
 * where the column is narrow (30px at 390), inside an `@container`. A name that wrapped did so on
 * different lines in the fallback face than in Newsreader, and no resizing of the fallback follows
 * 32 names letter for letter, so the page under it dropped a line when the font arrived (#225).
 */
export const clubName = `whitespace-nowrap text-clubname ${headlineFace}`;

export const storyDeck = "font-serif text-deck text-note normal-nums";

/** "Our pick: Washington, 63%." in the serif's italic. */
export const storyPick = "font-serif text-prose normal-nums italic leading-[1.4]";

/** "On TV ESPN+, TNT" under a story. */
export const storyOnTv = "text-[13px] text-aside leading-[1.5]";

/**
 * Beside a `Ledger`'s parts in a story's line score and Home's standings. The prototype's tables
 * there have no padding between their columns, which are fixed widths, and a phone's rows are
 * 40.2px apart, not a `LedgerRow`'s 44px: no row of either is a link on a phone.
 */
export const fitted = {
  /** A column's head, whose figures are proportional and whose words may wrap. */
  head: "whitespace-normal px-0 normal-nums",
  row: "max-md:h-auto",
  cell: "px-0",
};

/**
 * A sentence of serif prose where there is nothing to draw: an empty table, a day with no games, a
 * page that is not there. A place adds its own spacing, and `normal-nums` beside Home's labels.
 */
export const emptyProse = "font-serif text-note text-prose";
