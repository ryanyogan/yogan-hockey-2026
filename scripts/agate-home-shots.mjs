// Takes the site's kept pictures of Home and of a written piece: `docs/design/agate/news` and
// `docs/design/agate/pieces`, each the whole page (or `news` and `pieces` under an out-dir).
//
//   node scripts/agate-home-shots.mjs <site> [out-dir]
//
// <site> is a dev server in fixture mode. The sample picks and pieces are seeded first. Home is
// specified by `docs/design/front-page` (#240), which `scripts/front-page-check.mjs` measures.

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { seedPicks } from "./look-routes.mjs";

const [site, outDir] = process.argv.slice(2);
if (!site) {
  console.error("usage: node scripts/agate-home-shots.mjs <site> [out-dir]");
  process.exit(2);
}
const out = (folder) => {
  const path = outDir
    ? `${resolve(outDir, folder)}/`
    : fileURLToPath(new URL(`../docs/design/agate/${folder}/`, import.meta.url));
  mkdirSync(path, { recursive: true });
  return path;
};
const NO_PIECES = "/skeleton/dashboard?slate=tonight&pieces=0";
const WIDTHS = { 390: 844, 1440: 900 };
const BOTH = ["light", "dark"];
/** Each picture's folder, name, address, and the themes it is kept in at each width. */
const SHOTS = [
  ["news", "site-home", "/", BOTH],
  ["news", "site-no-news", "/skeleton/dashboard?slate=tonight&news=0", ["light"], [1440]],
  ["pieces", "site-home", "/", BOTH],
  ["pieces", "site-home-no-pieces", NO_PIECES, BOTH],
  ["pieces", "site-piece", "/pieces/2026-10-06-preview", BOTH],
];

const browser = await chromium.launch();
await seedPicks(browser, site);
for (const [folder, name, path, themes, widths = Object.keys(WIDTHS).map(Number)] of SHOTS) {
  for (const theme of themes) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: WIDTHS[width] },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.goto(site + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `${out(folder)}${name}-${width}-${theme}.png`,
        fullPage: true,
      });
      await context.close();
    }
  }
}
await browser.close();
