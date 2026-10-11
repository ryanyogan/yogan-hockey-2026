// PROTOTYPE (#128). Takes the screenshots under docs/design/tuned-ledger and measures the pages.
// Needs the prototype running, and the repo's Playwright (a dev tool; the prototype needs neither):
//   PORT=5302 pnpm prototype:look
//   PREVIEW_URL=http://localhost:5302 node prototypes/tuned-ledger/capture.mjs [name-prefix]
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const origin = process.env.PREVIEW_URL ?? "http://localhost:5128";
const only = process.argv[2];
const out = fileURLToPath(new URL("../../docs/design/tuned-ledger/", import.meta.url));
await mkdir(out, { recursive: true });

const WIDTHS = { 390: 844, 1440: 900 };
const THEMES = ["light", "dark"];
const shots = [];
for (const screen of ["home", "game", "standings"]) shots.push({ name: screen, screen });
// The end state of each animation, which is also what reduced motion shows.
for (const play of ["goal", "goal-home", "shot", "save"]) {
  shots.push({ name: `rink-${play}`, screen: "game", query: `&play=${play}`, rink: true });
}
// The typeface and weight choices on the same phone page.
for (const font of ["geist", "jetbrains", "plex"]) {
  for (const weights of ["regular", "medium", "heavy"]) {
    shots.push({
      name: `type-${font}-${weights}`,
      screen: "home",
      query: `&font=${font}&weights=${weights}`,
      phone: true,
    });
  }
}
shots.push({
  name: "today-colours",
  screen: "home",
  query: "&colors=today&weights=regular",
  phone: true,
});
shots.push({ name: "switcher", screen: "home", chrome: true, open: true, phone: true });

const browser = await chromium.launch();
const manifest = { origin, capturedAt: new Date().toISOString(), pages: [] };
for (const shot of shots) {
  if (only && !shot.name.startsWith(only)) continue;
  for (const [width, height] of Object.entries(WIDTHS)) {
    if (shot.phone && width !== "390") continue;
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: Number(width), height },
        deviceScaleFactor: width === "390" ? 2 : 1,
        hasTouch: width === "390",
        timezoneId: "America/Chicago",
        // Every shot is an end state: the animations are jumped to their last frame.
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const chrome = shot.chrome ? "" : "&chrome=0";
      await page.goto(`${origin}/?theme=${theme}${chrome}${shot.query ?? ""}#/${shot.screen}`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector(".shell");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      if (shot.open) await page.click("[data-sw=sheet]");
      const measured = await page.evaluate(() => {
        const style = (selector, property) => {
          const element = document.querySelector(selector);
          return element ? getComputedStyle(element)[property] : null;
        };
        const box = (selector) => {
          const element = [...document.querySelectorAll(selector)].find(
            (candidate) => candidate.getClientRects().length > 0,
          );
          const rect = element?.getBoundingClientRect();
          return rect == null
            ? null
            : {
                width: Math.round(rect.width * 10) / 10,
                height: Math.round(rect.height * 10) / 10,
              };
        };
        const family = style("body", "fontFamily").split(",")[0];
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          font: family,
          fontLoaded: document.fonts.check(`${style("body", "fontSize")} ${family}`),
          bodySize: style("body", "fontSize"),
          smallSize: style(".ledger th, .timeline .period", "fontSize"),
          row: box(".ledger tbody tr, .plays .play"),
          tab: box(".tabbar a"),
          themeToggle: box(".topbar .theme-toggle"),
          lampLit: document.querySelector(".lamp[style]") != null,
        };
      });
      const file = `${shot.name}-${width}-${theme}.png`;
      if (shot.rink) await page.locator(".rink-wrap").screenshot({ path: out + file });
      else {
        // A whole page is shot in a viewport as tall as the page, so the fixed tab bar is drawn
        // once, at the foot, and not across the middle of a stitched image.
        if (!shot.phone) {
          const tall = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width: Number(width), height: Math.max(tall, height) });
        }
        await page.screenshot({ path: out + file });
      }
      manifest.pages.push({ file, ...measured, errors });
      await context.close();
    }
  }
}
await browser.close();
if (!only) await writeFile(`${out}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
const bad = manifest.pages.filter(
  (page) => page.overflow > 0 || page.errors.length > 0 || !page.fontLoaded,
);
console.log(
  `${manifest.pages.length} shots, ${bad.length} with overflow, errors or a missing font`,
);
for (const page of bad) console.log(JSON.stringify(page));
