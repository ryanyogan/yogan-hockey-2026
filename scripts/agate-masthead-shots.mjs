// Takes the site's kept pictures of the masthead (`docs/design/agate/masthead/site-*`): the top
// of Home at each width in both themes, the sections under the pointer, and the sections stuck
// to the top of a scrolled page.
//
//   node scripts/agate-masthead-shots.mjs <site> [out-dir]
//
// <site> is a dev server in fixture mode. It prints the width of each section's cell, and exits
// 1 when a page scrolls sideways or, on a phone, the sections do. The six sections go a size
// down below 390px, so the phone is shot at 360 and 375 as well as 390. The masthead is
// specified by `docs/design/front-page` (#240), which `scripts/front-page-check.mjs` measures.

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const [site, outDir] = process.argv.slice(2);
if (!site) {
  console.error("usage: node scripts/agate-masthead-shots.mjs <site> [out-dir]");
  process.exit(2);
}
const out = outDir
  ? `${resolve(outDir)}/`
  : fileURLToPath(new URL("../docs/design/agate/masthead/", import.meta.url));
mkdirSync(out, { recursive: true });
const NAV = 'nav[aria-label="Site"]';

const browser = await chromium.launch();
let failed = 0;

/** One picture of the top of a page. `scroll` is how far down it is first; `hover` what the pointer is on. */
async function shot(name, path, width, { theme = "light", hover, scroll, height = 340 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.goto(site + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (scroll) await page.evaluate((y) => scrollTo(0, y), scroll);
  if (hover) await page.hover(hover);
  const measured = await page.evaluate((selector) => {
    const sections = document.querySelector(selector);
    return {
      page: document.documentElement.scrollWidth,
      sections: [sections.scrollWidth, sections.clientWidth],
      cells: [...sections.querySelectorAll("a")].map(
        (cell) => Math.round(cell.getBoundingClientRect().width * 10) / 10,
      ),
    };
  }, NAV);
  const sideways =
    measured.page !== width || (width < 768 && measured.sections[0] > measured.sections[1]);
  if (sideways) failed++;
  console.log(`${name}: cells ${measured.cells.join(", ")}${sideways ? "; SCROLLS SIDEWAYS" : ""}`);
  await page.screenshot({ path: `${out}${name}.png`, clip: { x: 0, y: 0, width, height } });
  await context.close();
}

for (const theme of ["light", "dark"])
  for (const width of [390, 1440]) await shot(`site-${width}-${theme}`, "/", width, { theme });
for (const width of [360, 375, 768, 1024]) await shot(`site-${width}-light`, "/", width);
// The pointer on Teams, the page in Standings.
await shot("site-hover-1440-light", "/nhl?tab=standings", 1440, { hover: `${NAV} a:nth-child(4)` });
for (const width of [390, 1440])
  await shot(`site-stuck-${width}-light`, "/nhl?tab=standings", width, {
    scroll: 700,
    height: 200,
  });
await browser.close();
process.exit(failed === 0 ? 0 : 1);
