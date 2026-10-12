// PROTOTYPE (Agate). Takes the screenshots under docs/design/agate.
// Needs the prototype running, and the repo's Playwright:
//   PORT=5302 pnpm prototype:agate
//   PREVIEW_URL=http://localhost:5302 node prototypes/agate/capture.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const origin = process.env.PREVIEW_URL ?? "http://localhost:5129";
const out = fileURLToPath(new URL("../../docs/design/agate/", import.meta.url));
await mkdir(out, { recursive: true });

const WIDTHS = { 390: 844, 1440: 900 };
const browser = await chromium.launch();
for (const slate of ["tonight", "busy"]) {
  for (const theme of ["light", "dark"]) {
    for (const [width, height] of Object.entries(WIDTHS)) {
      const page = await browser.newPage({ viewport: { width: Number(width), height } });
      await page.goto(`${origin}/?slate=${slate}&theme=${theme}&chrome=0`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${out}home-${slate}-${width}-${theme}.png`, fullPage: true });
      await page.close();
    }
  }
}
await browser.close();
console.log(`Wrote ${out}`);
