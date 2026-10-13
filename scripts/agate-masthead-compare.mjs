// Measures the masthead and the footer of the site against the Agate prototype
// (`pnpm prototype:agate`), at phone and desktop widths in both themes, and says where they differ.
//
//   node scripts/agate-masthead-compare.mjs <site> [out-dir] [prototype] [site-path]
//
// <site> is the dev server ("http://localhost:5470"); the prototype defaults to port 5129. With
// an out-dir it also saves a shot of the top of each page, the prototype's beside the site's
// names (`proto-390-light.png`, `site-390-light.png`). It prints every measurement that differs
// and exits 1 when any does, or when either page scrolls sideways.
//
// The words differ (the prototype's slate is its own), so a box whose size follows its words is
// measured by its type and its rules, not by its width.

import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [site, outDir, prototype = "http://localhost:5129", sitePath = "/"] = process.argv.slice(2);
if (!site) {
  console.error(
    "usage: node scripts/agate-masthead-compare.mjs <site> [out-dir] [prototype] [site-path]",
  );
  process.exit(2);
}
if (outDir) mkdirSync(outDir, { recursive: true });

const WIDTHS = [390, 1440];
const THEMES = ["light", "dark"];

/** Each part, as the prototype names it and as the site does. `at` is the widths that draw it. */
const PARTS = [
  { part: "page", proto: ".page", site: '[data-slot="page"]', box: ["x", "width"] },
  {
    part: "wordmark",
    proto: ".wordmark",
    site: '[data-slot="wordmark"]',
    type: true,
    box: ["x", "y", "width", "height"],
  },
  {
    part: "date under the wordmark",
    proto: ".masthead__date",
    site: '[data-slot="masthead-date"]',
    at: [390],
    type: true,
    box: ["y", "height"],
  },
  {
    part: "date on the sections' bar",
    proto: ".section-row__date",
    site: '[data-slot="section-date"]',
    at: [1440],
    type: true,
    box: ["x", "y", "height"],
  },
  {
    part: "sections' bar",
    proto: ".section-row",
    site: '[data-slot="section-nav"]',
    position: true,
    box: ["x", "y", "width", "height"],
  },
  {
    part: "sections' rules",
    proto: ".section-row__inner",
    site: '[data-slot="section-nav"] > div',
    box: ["x", "y", "width", "height"],
  },
  {
    part: "sections",
    proto: ".sections",
    site: 'nav[aria-label="Site"]',
    // Its width follows its words, and the site's own font files set them a little wider.
    box: ["centre"],
    at: [1440],
  },
  {
    part: "section",
    proto: ".sections a:not([aria-current])",
    site: 'nav[aria-label="Site"] a:not([aria-current])',
    type: true,
    box: ["height"],
  },
  {
    part: "current section",
    proto: '.sections a[aria-current="page"]',
    site: 'nav[aria-label="Site"] a[aria-current="page"]',
    type: true,
    box: ["height"],
  },
  {
    part: "theme group",
    proto: ".theme",
    site: '[role="group"][aria-label="Theme"]',
    box: ["right", "y"],
    rules: false,
    // Written twice and drawn once, at any width.
    one: true,
  },
  {
    part: "theme button",
    proto: ".theme button",
    site: '[role="group"][aria-label="Theme"] button',
    type: true,
    box: ["width", "height"],
    words: ["Day", "Night"],
  },
  {
    part: "dateline",
    proto: ".dateline",
    site: '[data-slot="dateline"]',
    box: ["x", "y", "width", "height"],
  },
  {
    part: "dateline's rules",
    proto: ".dateline__rules",
    site: '[data-slot="dateline"] > div',
    box: ["x", "y", "width", "height"],
  },
  {
    part: "dateline line",
    proto: ".dateline__inner",
    site: '[data-slot="dateline"] p',
    type: true,
    box: ["height"],
  },
  { part: "footer", proto: ".footer", site: "footer", type: true, box: ["x", "width"] },
  { part: "footer link", proto: ".footer a", site: "footer a", type: true },
];

const TYPE = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "color",
  "fontVariationSettings",
];
const POSITION = ["position", "top"];
const RULES = [
  "borderTopWidth",
  "borderTopColor",
  "borderBottomWidth",
  "borderBottomColor",
  "paddingTop",
  "paddingBottom",
  "marginTop",
  "backgroundColor",
];

function measure({ selector, type, words }) {
  // The first one drawn: each layout hides what the other draws.
  const drawn = [...document.querySelectorAll(selector)].filter(
    (node) =>
      node.getClientRects().length > 0 && (!words || words.includes(node.textContent.trim())),
  );
  const node = drawn[0];
  if (!node) return null;
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  const read = (names) => Object.fromEntries(names.map((name) => [name, style[name]]));
  return {
    count: drawn.length,
    ...read(["position", "top"]),
    ...read([
      "borderTopWidth",
      "borderTopColor",
      "borderBottomWidth",
      "borderBottomColor",
      "paddingTop",
      "paddingBottom",
      "marginTop",
      "backgroundColor",
    ]),
    ...(type
      ? read([
          "fontFamily",
          "fontSize",
          "fontWeight",
          "lineHeight",
          "letterSpacing",
          "textTransform",
          "color",
          "fontVariationSettings",
        ])
      : {}),
    x: rect.x,
    y: rect.y + scrollY,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    centre: rect.x + rect.width / 2,
  };
}

/** A family is the same when its first face is: the site's stack names its fallbacks too. */
const firstFace = (family) => family.split(",")[0].replaceAll(/['"]/g, "").trim();
const same = (name, a, b) => {
  if (name === "fontFamily") return firstFace(a) === firstFace(b);
  if (typeof a === "number") return Math.abs(a - b) <= 0.5;
  // A border of no width has a colour nobody sees.
  return a === b;
};

const browser = await chromium.launch();
let differences = 0;
for (const width of WIDTHS) {
  for (const theme of THEMES) {
    const pages = {};
    for (const [name, url] of [
      ["proto", `${prototype}/?slate=busy&theme=${theme}&chrome=0`],
      ["site", site + sitePath],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // The site's dateline arrives with the Scoreboard.
      if (name === "site")
        await page
          .locator('[data-slot="dateline"] span:not([aria-hidden])')
          .first()
          .waitFor({ state: "attached" });
      if (outDir)
        await page.screenshot({
          path: `${outDir}/${name}-${width}-${theme}.png`,
          clip: { x: 0, y: 0, width, height: width < 768 ? 300 : 340 },
        });
      if (outDir) {
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.screenshot({
          path: `${outDir}/${name}-${width}-${theme}-foot.png`,
          clip: { x: 0, y: 900 - 140, width, height: 140 },
        });
        // Everything is measured with the page at its top.
        await page.evaluate(() => scrollTo(0, 0));
      }
      const measured = {};
      for (const part of PARTS) {
        if (part.at && !part.at.includes(width)) continue;
        measured[part.part] = await page.evaluate(measure, {
          selector: part[name],
          type: part.type,
          words: part.words,
        });
      }
      measured.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      pages[name] = measured;
      await context.close();
    }
    const where = `${width} ${theme}`;
    for (const side of ["proto", "site"]) {
      if (pages[side].scrollWidth !== width) {
        differences++;
        console.log(`${where}: ${side} scrolls sideways (scrollWidth ${pages[side].scrollWidth})`);
      }
    }
    for (const part of PARTS) {
      if (part.at && !part.at.includes(width)) continue;
      const [proto, here] = [pages.proto[part.part], pages.site[part.part]];
      if (!proto || !here) {
        differences++;
        console.log(
          `${where}: ${part.part}: ${proto ? "not drawn on the site" : "not drawn in the prototype"}`,
        );
        continue;
      }
      const names = [
        ...(part.rules === false ? [] : RULES),
        ...(part.type ? TYPE : []),
        ...(part.position ? POSITION : []),
        ...(part.box ?? []),
      ];
      if (part.one && (proto.count !== 1 || here.count !== 1)) {
        differences++;
        console.log(
          `${where}: ${part.part}: drawn ${proto.count} times in the prototype, ${here.count} on the site`,
        );
      }
      for (const name of names) {
        if (
          name.endsWith("Color") &&
          name.startsWith("border") &&
          proto[name.replace("Color", "Width")] === "0px" &&
          here[name.replace("Color", "Width")] === "0px"
        )
          continue;
        if (same(name, proto[name], here[name])) continue;
        differences++;
        console.log(
          `${where}: ${part.part}: ${name}: prototype ${proto[name]}, site ${here[name]}`,
        );
      }
    }
  }
}
await browser.close();
console.log(
  differences === 0
    ? "The masthead and the footer measure the same."
    : `${differences} differences.`,
);
process.exit(differences === 0 ? 0 : 1);
