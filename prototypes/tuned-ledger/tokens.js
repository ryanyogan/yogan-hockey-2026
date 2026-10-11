// PROTOTYPE (#128). The colours being compared: the page sets them as CSS variables, and
// contrast.mjs measures them. "today" is production (packages/ui/src/theme.css and the opacities
// its components use); "tuned" is the proposal.

/** Lays a colour at an opacity over a background, as `text-foreground/50` does. */
export function over(foreground, background, alpha) {
  const channels = (hex) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const [f, b] = [channels(foreground), channels(background)];
  const mixed = f.map((value, index) => Math.round(value * alpha + b[index] * (1 - alpha)));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

const today = (bg, fg, rest) => ({
  bg,
  fg,
  // A note, an idle link or second line; a column header or count; an aside (a record, a rank).
  "fg-2": over(fg, bg, 0.6),
  "fg-3": over(fg, bg, 0.5),
  "fg-4": over(fg, bg, 0.4),
  // The rule under a column header is the foreground at 20%.
  "rule-head": over(fg, bg, 0.2),
  ...rest,
});

export const PALETTES = {
  today: {
    light: today("#fbfaf7", "#171717", {
      rule: "#e5e5e5",
      "rule-frame": "#d4d4d4",
      live: "#dc2626",
      "live-tint": "#fef2f2",
      highlight: "#fef9c2",
      positive: "#15803d",
      negative: "#dc2626",
      block: "#171717",
      "block-fg": "#ffffff",
    }),
    dark: today("#0f172a", "#f1f5f9", {
      rule: "#1e293b",
      "rule-frame": "#475569",
      live: "#f87171",
      "live-tint": "#2a1a2a",
      highlight: "#1e293b",
      positive: "#4ade80",
      negative: "#f87171",
      block: "#f1f5f9",
      "block-fg": "#0f172a",
    }),
  },
  tuned: {
    light: {
      bg: "#fbfaf7",
      fg: "#171717",
      "fg-2": "#44403c",
      "fg-3": "#57534e",
      "fg-4": "#6b6660",
      rule: "#c9c5bc",
      "rule-head": "#8a857c",
      "rule-frame": "#8a857c",
      live: "#c81e1e",
      "live-tint": "#fdeceb",
      highlight: "#fdf5b0",
      positive: "#15803d",
      negative: "#c81e1e",
      block: "#171717",
      "block-fg": "#ffffff",
    },
    dark: {
      bg: "#0f172a",
      fg: "#f1f5f9",
      "fg-2": "#cbd5e1",
      "fg-3": "#a9b6c8",
      "fg-4": "#94a3b8",
      rule: "#3b4a61",
      "rule-head": "#64748b",
      "rule-frame": "#64748b",
      live: "#f87171",
      "live-tint": "#3a1d2c",
      highlight: "#1e293b",
      positive: "#4ade80",
      negative: "#f87171",
      block: "#f1f5f9",
      "block-fg": "#0f172a",
    },
  },
};

/** What each colour is for, in the order the contrast table lists them. */
export const ROLES = [
  ["fg", "Body text, scores"],
  ["fg-2", "Notes, idle links, second lines"],
  ["fg-3", "Column headers, counts"],
  ["fg-4", "Asides: records, ranks, footer"],
  ["live", "Live marker"],
  ["rule", "Rule under a row"],
  ["rule-head", "Rule under a column header"],
  ["rule-frame", "Rules framing the shell"],
];
