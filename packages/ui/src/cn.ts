import { createCn } from "cn/config";

/**
 * Joins class names, a later class replacing an earlier one that sets the same thing. It is `cn`
 * told the names `theme.css` adds, which it would otherwise guess at: `text-small` is a size and
 * `text-label` a colour, so neither removes the other, and `font-strong` is a weight, not a
 * typeface. A new size, weight, spacing or tracking token in `theme.css` is named here too.
 */
export const cn = createCn({
  extend: {
    theme: {
      text: ["body", "small", "score", "wordmark"],
      "font-weight": ["quiet", "body", "label", "strong", "score"],
      spacing: ["row"],
      tracking: ["label"],
    },
  },
});
