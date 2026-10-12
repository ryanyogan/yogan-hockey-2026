// Measures Home against the Agate prototype (`pnpm prototype:agate`), element by element, on the
// prototype's two slates at phone and desktop widths in both themes, and says where they differ.
//
//   node scripts/agate-home-compare.mjs <site> [out-dir] [prototype]
//
// <site> is a dev server in fixture mode ("http://localhost:5471"), which draws the prototype's
// slates on `/skeleton/dashboard?slate=tonight|busy`; the prototype defaults to port 5129. With an
// out-dir it also saves each whole page (`proto-busy-390-light.png`, `site-busy-390-light.png`).
// It prints every measurement that differs and exits 1 when any does, or when a page scrolls
// sideways.
//
// Every element a selector finds is compared with the one in the same place on the other page:
// its type, its rules, paddings and margins, its grid, and its box (the place measured from the
// top of `<main>`, since the mastheads above are not the same slate). The standings' clubs differ
// (the site's are the recorded fixtures), which their fixed columns do not show.
//
// Home is built of the `packages/ui` primitives, which draw three things another way than the
// prototype's CSS does, to the same picture; the script reads each as what is drawn:
// - a table row's rule is the row's in a `Ledger` and each cell's in the prototype (collapsed
//   borders draw both on the same line), so a cell with no rule under it is given its row's;
// - a mark is a flex box with a gap for a star it may hold, and the conference control a flex row
//   of equal cells where the prototype's is a grid: a gap is read only of a box holding more than
//   one thing, and grid columns only where both are grids. The boxes are compared either way;
// - a part's third entry names what is not compared, with the reason beside it.
//
// Run it on Linux. Google answers a Linux Chrome with hinted font files, in which a semibold at
// 13px is as wide as the regular, and every other browser with unhinted ones; the site's own
// files are Fontsource's, which are the hinted ones (19.8 KB a weight against 14.8). So on Linux
// the prototype is given the files the site serves, and anywhere else its words in the condensed
// bold measure 4 to 8px wider than the site's.

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [site, outDir, prototype = "http://localhost:5129"] = process.argv.slice(2);
if (!site) {
  console.error("usage: node scripts/agate-home-compare.mjs <site> [out-dir] [prototype]");
  process.exit(2);
}
if (outDir) mkdirSync(outDir, { recursive: true });

const SLATES = ["tonight", "busy"];
const WIDTHS = [390, 1440];
const THEMES = ["light", "dark"];

/** Each part, as the prototype names it and as the site does. */
const PARTS = [
  ["roundup label", ".roundup > .label", "#roundup-heading"],
  ["stories", ".stories", '[data-slot="roundup"] > div'],
  ["story", ".story", '[data-slot="story"]'],
  ["kicker", ".kicker", '[data-slot="kicker"]'],
  ["live dot", ".live-dot", '[data-slot="live-dot"]'],
  ["headline", ".headline", '[data-slot="story"] h3'],
  ["headline link", ".headline a", '[data-slot="story"] h3 a'],
  ["deck", ".deck", '[data-slot="deck"]'],
  ["line score", ".linescore", '[data-slot="line-score"]'],
  ["line score head", ".linescore thead th", '[data-slot="line-score"] thead th'],
  ["line score team", ".linescore tbody th", '[data-slot="line-score"] tbody th'],
  ["line score cell", ".linescore td", '[data-slot="line-score"] td'],
  ["story pick", ".pick", '[data-slot="story-pick"]'],
  ["story mark", ".story .mark", '[data-slot="story"] [data-slot="pick-outcome"]'],
  ["on tv", ".tv", '[data-slot="on-tv"]'],
  ["on tv label", ".tv strong", '[data-slot="on-tv"] strong'],
  ["briefs", ".briefs", '[data-slot="briefs"]'],
  ["briefs label", ".briefs > .label", "#briefs-heading"],
  ["brief list", ".brief-list", '[data-slot="briefs"] ul'],
  ["brief", ".brief", '[data-slot="brief"]'],
  ["brief game", ".brief__game", '[data-slot="brief"] > a'],
  ["brief status", ".brief__status", '[data-slot="brief-status"]'],
  ["brief pick", ".brief__pick", '[data-slot="brief-pick"]'],
  ["brief mark", ".brief .mark", '[data-slot="brief"] [data-slot="pick-outcome"]'],
  ["brief no pick", ".brief__pick .dim", '[data-slot="brief-pick"] > span:not([data-slot])'],
  ["lower band", ".lower", '[data-slot="lower-band"]'],
  ["standings", ".standings", '[data-slot="standings"]'],
  ["standings head", ".band-head", '[data-slot="standings"] > div:first-child'],
  ["standings title", ".band-title", "#standings-heading"],
  ["full standings", ".band-head .more", '[data-slot="standings"] > div:first-child a'],
  ["conference control", ".conf-tabs", '[role="group"][aria-label="Conference"]'],
  // The prototype's button has the browser's own padding (1px 6px) and a tab cell has 16px at
  // its sides and does not wrap. The one word is centred in a cell half the screen wide, so
  // none of it is seen.
  [
    "conference button",
    ".conf-tabs button",
    '[role="group"][aria-label="Conference"] button',
    ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "whiteSpace"],
  ],
  ["conferences", ".confs", '[data-slot="standings"] > div:last-child'],
  ["conference label", ".conf h3", '[data-slot="conference"] h3'],
  ["conference table", ".conf table", '[data-slot="conference"] table'],
  ["conference head", ".conf thead th", '[data-slot="conference"] thead th'],
  ["conference cell", ".conf td", '[data-slot="conference"] td'],
  ["aside", ".aside", '[data-slot="lower-band"] > aside'],
  ["picks box", ".picks-box", '[data-slot="picks-box"]'],
  ["picks label", ".picks-box .label", "#picks-heading"],
  ["picks record", ".picks-box__score", '[data-slot="picks-record"]'],
  ["picks note", ".picks-box__note", '[data-slot="picks-note"]'],
  ["glance", ".glance", '[data-slot="glance"]'],
  ["glance label", ".glance h2", "#glance-heading"],
  ["glance grid", ".glance__grid", '[data-slot="glance"] dl'],
  ["glance cell", ".glance__grid > div", '[data-slot="glance"] dl > div'],
  ["glance figure", ".glance__n", '[data-slot="glance"] dd'],
  ["glance word", ".glance__k", '[data-slot="glance"] dt'],
  ["favorites", ".favorites", '[data-slot="favorites"]'],
  ["favorites head", ".favorites__head", '[data-slot="favorites"] > div'],
  ["favorites label", ".favorites .label", "#favorites-heading"],
  ["all players", ".favorites .more", '[data-slot="favorites"] > div a'],
  ["favorites prose", ".favorites p", '[data-slot="favorites"] > p'],
  ["find a player", ".favorites p a", '[data-slot="favorites"] > p a'],
];

/** What is read of each element. A side's rule is its width, and its style and colour if it has one. */
const STYLES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textAlign",
  "textDecorationLine",
  "whiteSpace",
  "color",
  "backgroundColor",
  "fontVariationSettings",
  "fontVariantNumeric",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "borderRadius",
  "animationDuration",
  "order",
];
const SIDES = ["Top", "Right", "Bottom", "Left"];

function measure({ selector, styles, sides }) {
  const top = document.querySelector("main").getBoundingClientRect().top;
  // Only what is drawn: each layout hides what the other shows.
  return [...document.querySelectorAll(selector)]
    .filter((node) => node.getClientRects().length > 0)
    .map((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const measured = Object.fromEntries(styles.map((name) => [name, style[name]]));
      const rule = (of, side) => {
        const width = of[`border${side}Width`];
        return width === "0px"
          ? "none"
          : `${width} ${of[`border${side}Style`]} ${of[`border${side}Color`]}`;
      };
      for (const side of sides) measured[`border${side}`] = rule(style, side);
      // In a table of collapsed borders a row's rule is drawn where its cells' would be.
      const row = node.matches("td, th") ? node.parentElement : null;
      if (row && measured.borderBottom === "none")
        measured.borderBottom = rule(getComputedStyle(row), "Bottom");
      return {
        ...measured,
        // How many things the box holds: elements, and runs of text that are not only space.
        holds: [...node.childNodes].filter(
          (child) => child.nodeType === 1 || (child.nodeType === 3 && child.textContent.trim()),
        ).length,
        text: node.textContent.replaceAll("⁠", "").replaceAll(/\s+/g, " ").trim().slice(0, 60),
        x: rect.x,
        y: rect.y - top,
        width: rect.width,
        height: rect.height,
      };
    });
}

/**
 * A family is the same when its first face is: the site's stack names its fallback faces too, and
 * Fontsource calls the variable Newsreader "Newsreader Variable".
 */
const firstFace = (family) =>
  family
    .split(",")[0]
    .replaceAll(/['"]/g, "")
    .replace(/ Variable$/, "")
    .trim();
/** Lengths and lists of lengths ("12px", "300px 300px") to within half a pixel; the rest exactly. */
function same(name, a, b) {
  if (name === "fontFamily") return firstFace(a) === firstFace(b);
  if (typeof a === "number") return Math.abs(a - b) <= 0.5;
  const lengths = /^(-?[\d.]+px ?)+$/;
  if (lengths.test(a) && lengths.test(b)) {
    const [left, right] = [a, b].map((each) => each.split(" ").map(Number.parseFloat));
    return (
      left.length === right.length && left.every((each, at) => Math.abs(each - right[at]) <= 0.5)
    );
  }
  return a === b;
}
/** What says nothing about an element that has no such thing. */
function idle(name, measured, other) {
  // Columns are a grid's, and two boxes that are not both grids are compared by their places.
  if (name === "gridTemplateColumns")
    return !measured.display?.includes("grid") || !other.display?.includes("grid");
  // A gap parts two things: a box holding one has none to show.
  if (name === "rowGap" || name === "columnGap") return measured.holds <= 1 && other.holds <= 1;
  return false;
}

const browser = await chromium.launch();
let differences = 0;
const report = (line) => {
  differences++;
  console.log(line);
};
for (const slate of SLATES) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const pages = {};
      for (const [name, url] of [
        ["proto", `${prototype}/?slate=${slate}&theme=${theme}&chrome=0`],
        ["site", `${site}/skeleton/dashboard?slate=${slate}`],
      ]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: theme,
          timezoneId: "America/New_York",
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        // The pick line's italic is fetched when it is first drawn.
        await page.evaluate(() => document.fonts.ready);
        if (name === "site")
          await page.locator('[data-slot="favorites"][aria-busy="false"]').waitFor();
        await page.evaluate(() => document.fonts.ready);
        if (outDir)
          await page.screenshot({
            path: `${outDir}/${name}-${slate}-${width}-${theme}.png`,
            fullPage: true,
          });
        const measured = {};
        for (const [part, proto, here] of PARTS) {
          measured[part] = await page.evaluate(measure, {
            selector: name === "proto" ? proto : here,
            styles: [...STYLES, "display"],
            sides: SIDES,
          });
        }
        measured.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        pages[name] = measured;
        await context.close();
      }
      const where = `${slate} ${width} ${theme}`;
      for (const side of ["proto", "site"]) {
        if (pages[side].scrollWidth !== width)
          report(`${where}: ${side} scrolls sideways (scrollWidth ${pages[side].scrollWidth})`);
      }
      for (const [part, , , unread = []] of PARTS) {
        const [proto, here] = [pages.proto[part], pages.site[part]];
        if (proto.length !== here.length) {
          report(`${where}: ${part}: prototype draws ${proto.length}, site ${here.length}`);
          continue;
        }
        const names = [
          ...STYLES,
          ...SIDES.map((side) => `border${side}`),
          "x",
          "y",
          "width",
          "height",
        ];
        proto.forEach((expected, at) => {
          const found = here[at];
          for (const name of names) {
            if (unread.includes(name) || idle(name, expected, found)) continue;
            if (same(name, expected[name], found[name])) continue;
            report(
              `${where}: ${part} ${at + 1} "${expected.text.slice(0, 24)}": ${name}: prototype ${expected[name]}, site ${found[name]}`,
            );
          }
        });
      }
    }
  }
}
await browser.close();
console.log(differences === 0 ? "Home measures the same." : `${differences} differences.`);
process.exit(differences === 0 ? 0 : 1);
