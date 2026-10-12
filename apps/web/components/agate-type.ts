/**
 * The serif roles of `docs/design/agate.md` § Type that `packages/ui` has no utility for yet,
 * for the pages the prototype does not draw (#173). Home (#171) sets the same roles on its
 * stories; once its sizes are theme tokens these two are to be written in them.
 */

/** A headline: 40px, 34 on a phone, bold on 1.02, drawn at the 60pt optical size. */
export const HEADLINE =
  "font-serif font-strong text-[34px] leading-[1.02] tracking-[-0.015em] text-balance [font-variation-settings:'opsz'_60] md:text-[40px]";

/** A line of prose (an empty state, a page that has nothing to show): 17px roman on 1.4. */
export const PROSE = "font-serif text-[17px] leading-[1.4] text-note";

/** A "more" link: 13px semibold capitals, as the prototype's "Full standings". */
export const MORE = "font-label text-small uppercase tracking-head";
