// Writes `packages/ui/src/font-fallbacks.css`: the local faces a page is drawn in until
// Newsreader and IBM Plex Sans Condensed arrive, each resized so a line is as long as it will be.
//
//   node scripts/font-fallbacks.ts
//
// A fallback is an `@font-face` over a face the device already has, with `size-adjust` (how wide)
// and `ascent-override`, `descent-override` and `line-gap-override` (how tall a line is).
// `@capsizecss/core` writes the rule from `@capsizecss/metrics`, which has each face's metrics by
// weight. Its width is an average over how often each letter is used in English, and against the
// site's own text in a browser it is right to within 1% for half of these pairs and 3 to 6% out
// for the rest, which is a headline's second line. So each `size-adjust` here is the measured
// one (`node scripts/font-fallback-measure.mjs`, the long lines' ratio), with capsize's beside it,
// and capsize works the three overrides out from it. The serif's four were retaken in #235, when
// the script stopped reading a club's name with its abbreviation on the end.
//
// Each fallback has two cuts, since a bold is wider than its regular by a different amount in
// every face: a regular for weights under 600 and a bold from 600 up. The serif's bold is sized
// for a headline (Newsreader at its optical size 60), which is the serif bold that wraps.
import { writeFile } from "node:fs/promises";
import { createFontStack, type FontMetrics } from "@capsizecss/core";
import arial from "@capsizecss/metrics/arial";
import arialBold from "@capsizecss/metrics/arial/700";
import plex from "@capsizecss/metrics/iBMPlexSansCondensed";
import plexBold from "@capsizecss/metrics/iBMPlexSansCondensed/700";
import newsreader from "@capsizecss/metrics/newsreader";
import newsreaderBold from "@capsizecss/metrics/newsreader/700";
import notoSans from "@capsizecss/metrics/notoSans";
import notoSansBold from "@capsizecss/metrics/notoSans/700";
import notoSerif from "@capsizecss/metrics/notoSerif";
import notoSerifBold from "@capsizecss/metrics/notoSerif/700";
import roboto from "@capsizecss/metrics/roboto";
import robotoBold from "@capsizecss/metrics/roboto/700";
import timesNewRoman from "@capsizecss/metrics/timesNewRoman";
import timesNewRomanBold from "@capsizecss/metrics/timesNewRoman/700";

type Cut = {
  metrics: FontMetrics;
  /** The measured `size-adjust`, in percent. */
  sizeAdjust: number;
  /** Other names the same letters go by: a metric-compatible face, or a file's other name. */
  alsoLocal: readonly string[];
};
type Fallback = { regular: Cut; bold: Cut };
type Voice = { regular: FontMetrics; bold: FontMetrics; fallbacks: readonly Fallback[] };

/**
 * In the order a browser tries them. Times New Roman and Arial are on iOS, macOS and Windows;
 * Liberation Serif and Liberation Sans are their letter-for-letter stand-ins on Linux, where
 * `local("Arial")` finds nothing (a `local()` is not passed through fontconfig's aliases). Android
 * has neither pair: its sans is Roboto and its serif Noto Serif, which a Linux without the
 * Liberation faces often has too, with Noto Sans. A bold cut ends on the regular's names for an
 * Android whose Roboto or Noto is one variable file with no face called Bold.
 */
const VOICES: readonly Voice[] = [
  {
    regular: newsreader,
    bold: newsreaderBold,
    fallbacks: [
      {
        regular: { metrics: timesNewRoman, sizeAdjust: 99.63, alsoLocal: ["Liberation Serif"] },
        bold: {
          metrics: timesNewRomanBold,
          sizeAdjust: 107.48,
          alsoLocal: ["Liberation Serif Bold"],
        },
      },
      {
        regular: { metrics: notoSerif, sizeAdjust: 85.37, alsoLocal: ["Noto Serif"] },
        bold: {
          metrics: notoSerifBold,
          sizeAdjust: 92.1,
          alsoLocal: ["Noto Serif", "NotoSerif-Regular"],
        },
      },
    ],
  },
  {
    regular: plex,
    bold: plexBold,
    fallbacks: [
      {
        regular: { metrics: arial, sizeAdjust: 89.63, alsoLocal: ["Liberation Sans"] },
        bold: { metrics: arialBold, sizeAdjust: 89.05, alsoLocal: ["Liberation Sans Bold"] },
      },
      {
        regular: { metrics: roboto, sizeAdjust: 90.88, alsoLocal: ["Roboto"] },
        bold: { metrics: robotoBold, sizeAdjust: 91.13, alsoLocal: ["Roboto", "Roboto-Regular"] },
      },
      {
        regular: { metrics: notoSans, sizeAdjust: 86.88, alsoLocal: ["Noto Sans"] },
        bold: {
          metrics: notoSansBold,
          sizeAdjust: 88.37,
          alsoLocal: ["Noto Sans", "NotoSans-Regular"],
        },
      },
    ],
  },
];

const kebab = (property: string) =>
  property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** One `@font-face`: capsize's rule, at the measured width, over every name the face goes by. */
function fontFace(family: string, face: FontMetrics, cut: Cut, fontWeight: string): string {
  const options = { fontFaceFormat: "styleObject", fontFaceProperties: { fontWeight } } as const;
  const [fromLetters] = createFontStack([face, cut.metrics], options).fontFaces;
  const [measured] = createFontStack([face, cut.metrics], {
    ...options,
    fontFaceProperties: { fontWeight, sizeAdjust: `${cut.sizeAdjust}%` },
  }).fontFaces;
  if (!fromLetters || !measured) throw new Error(`No fallback for ${cut.metrics.familyName}.`);
  // Capsize names a lone fallback "Newsreader Fallback"; a voice has several, so each is named.
  const rule: Record<string, string | number | undefined> = {
    ...measured["@font-face"],
    fontFamily: `"${family}"`,
  };
  rule.src = [rule.src, ...cut.alsoLocal.map((name) => `local('${name}')`)].join(", ");
  const lines = Object.entries(rule)
    .filter(([, value]) => value !== undefined)
    .map(([property, value]) => `  ${kebab(property)}: ${value};`);
  return [
    `/* From letter frequencies alone: size-adjust ${fromLetters["@font-face"].sizeAdjust}. */`,
    "@font-face {",
    ...lines,
    "}",
  ].join("\n");
}

/** The stylesheet. `theme.css` names each family after its face, which a test in `packages/ui` holds. */
export function fontFallbacks(): { css: string } {
  const faces = VOICES.flatMap((voice) =>
    voice.fallbacks.flatMap((fallback) => {
      const family = `${voice.regular.familyName} Fallback: ${fallback.regular.metrics.familyName}`;
      return [
        fontFace(family, voice.regular, fallback.regular, "100 599"),
        fontFace(family, voice.bold, fallback.bold, "600 900"),
      ];
    }),
  );
  const css = [
    "/*",
    " * Written by `node scripts/font-fallbacks.ts`, which says what these are. Not edited by hand.",
    " */",
    ...faces,
    "",
  ].join("\n");
  return { css };
}

export const FONT_FALLBACKS_CSS = new URL("../packages/ui/src/font-fallbacks.css", import.meta.url);

if (import.meta.main) {
  await writeFile(FONT_FALLBACKS_CSS, fontFallbacks().css);
  console.log(`Wrote ${FONT_FALLBACKS_CSS.pathname}`);
}
