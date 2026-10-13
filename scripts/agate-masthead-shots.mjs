// Takes the masthead's kept pictures (`docs/design/agate/masthead`): the Agate prototype's
// (`after-*`), and the site's (`site-*`) when it is given one.
//
//   node scripts/agate-masthead-shots.mjs <prototype> [site]
//
// <prototype> is `PORT=<n> pnpm prototype:agate`; [site] is a dev server in fixture mode. It
// prints the width of each section's cell, and exits 1 when a page scrolls sideways or, on a
// phone, the sections do (the prototype's `?picks=1` is where six are measured: #218).

import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const [prototype, site] = process.argv.slice(2);
if (!prototype) {
  console.error("usage: node scripts/agate-masthead-shots.mjs <prototype> [site]");
  process.exit(2);
}
const out = fileURLToPath(new URL("../docs/design/agate/masthead/", import.meta.url));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
let failed = 0;

/** One picture of the top of a page. `scroll` is how far down it is first; `hover` what the pointer is on. */
async function shot(name, url, width, { nav, theme = "light", hover, scroll, height } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
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
  }, nav);
  const sideways =
    measured.page !== width || (width < 768 && measured.sections[0] > measured.sections[1]);
  if (sideways) failed++;
  console.log(`${name}: cells ${measured.cells.join(", ")}${sideways ? "; SCROLLS SIDEWAYS" : ""}`);
  await page.screenshot({
    path: `${out}${name}.png`,
    clip: { x: 0, y: 0, width, height: height ?? (width < 768 ? 300 : 340) },
  });
  await context.close();
}

const proto = (name, query, width, options) =>
  shot(name, `${prototype}/?slate=busy&chrome=0&${query}`, width, { nav: ".sections", ...options });
for (const theme of ["light", "dark"])
  for (const width of [390, 1440])
    await proto(`after-${width}-${theme}`, `theme=${theme}`, width, { theme });
await proto("after-360-light", "theme=light", 360);
// The pointer on Teams, the page in Standings.
await proto("after-hover-1440-light", "theme=light&at=Standings", 1440, {
  hover: ".sections a:nth-child(4)",
  height: 120,
});
for (const width of [390, 1440])
  await proto(`after-stuck-${width}-light`, "theme=light&at=Scores", width, {
    scroll: 700,
    height: 200,
  });
for (const width of [360, 390, 768, 1440])
  await proto(`after-with-picks-${width}-light`, "theme=light&picks=1", width, { height: 200 });

if (site) {
  const here = (name, path, width, options) =>
    shot(name, site + path, width, { nav: 'nav[aria-label="Site"]', ...options });
  for (const theme of ["light", "dark"])
    for (const width of [390, 1440]) await here(`site-${width}-${theme}`, "/", width, { theme });
  await here("site-hover-1440-light", "/nhl?tab=standings", 1440, {
    hover: 'nav[aria-label="Site"] a:nth-child(4)',
    height: 120,
  });
  for (const width of [390, 1440])
    await here(`site-stuck-${width}-light`, "/nhl?tab=standings", width, {
      scroll: 700,
      height: 200,
    });
}
await browser.close();
process.exit(failed === 0 ? 0 : 1);
