/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Read from disk: Vitest gives an empty string for a `.css?raw` import.
const css = readFileSync(new URL("./theme.css", import.meta.url), "utf8");

/** The custom properties a block of `theme.css` sets, by name. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  const block = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries(
    [...block.matchAll(/^\s*--([\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => [name, value]),
  );
}

/** A token's colour as written, following one `var()` to another token. */
function hex(theme: Record<string, string>, name: string): string {
  const value = theme[name] ?? "";
  const other = /^var\(--([\w-]+)\)$/.exec(value);
  return other ? hex(theme, other[1] ?? "") : value;
}

/** WCAG 2's relative luminance of a `#rrggbb` colour. */
function luminance(colour: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) => {
    const channel = Number.parseInt(colour.slice(at, at + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2's contrast ratio, to one decimal place, rounded down so that 4.49 is not 4.5. */
function contrast(text: string, ground: string): number {
  const [light, dark] = [luminance(text), luminance(ground)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return Math.floor(((light + 0.05) / (dark + 0.05)) * 10) / 10;
}

const THEMES = { day: tokens(":root"), night: tokens(".dark") };
/** Every token text is drawn in. `live` is the one red by another name. */
const TEXT = ["foreground", "note", "label", "aside", "kicker", "live", "positive", "negative"];
/** What text is drawn on: the page, and the row under the pointer. */
const GROUNDS = ["background", "highlight"];

const measured = Object.fromEntries(
  Object.entries(THEMES).map(([name, theme]) => [
    name,
    Object.fromEntries(
      TEXT.map((role) => [
        role,
        GROUNDS.map((ground) => contrast(hex(theme, role), hex(theme, ground))),
      ]),
    ),
  ]),
);

describe("the theme's text roles", () => {
  it("each pass AA (4.5:1) on the page and on the row under the pointer, by day and by night", () => {
    for (const [theme, roles] of Object.entries(measured))
      for (const [role, ratios] of Object.entries(roles))
        for (const [at, ratio] of ratios.entries())
          expect(ratio, `${theme} --${role} on --${GROUNDS[at]}`).toBeGreaterThanOrEqual(4.5);
  });

  // The table in docs/design/agate.md § Tokens is these numbers: [on the page, on --highlight].
  it("measure what docs/design/agate.md says they do", () => {
    expect(measured).toEqual({
      day: {
        foreground: [18, 16.4],
        note: [13.7, 12.4],
        label: [6.5, 5.9],
        aside: [6.5, 5.9],
        kicker: [5.6, 5.1],
        live: [5.6, 5.1],
        positive: [6.8, 6.1],
        negative: [5.4, 4.9],
      },
      night: {
        foreground: [15.5, 13.7],
        note: [12.5, 11],
        label: [7.1, 6.3],
        aside: [7.1, 6.3],
        kicker: [6.1, 5.4],
        live: [6.1, 5.4],
        positive: [10.7, 9.4],
        negative: [6.7, 5.9],
      },
    });
  });

  it("has no tint for a live row: nothing is drawn on one", () => {
    expect(css).not.toContain("live-tint");
  });
});
