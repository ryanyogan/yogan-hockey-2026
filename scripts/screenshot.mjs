// Takes one screenshot for a side-by-side comparison against the Reference UI.
// Usage: node scripts/screenshot.mjs <url> <out.png> <width> [light|dark] [height] [--menu]
import { chromium } from "@playwright/test";

const [url, out, width = "1440", scheme = "light", height = "900"] = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--"));
const openMenu = process.argv.includes("--menu");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  colorScheme: scheme,
});
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
if (openMenu) await page.getByRole("button", { name: "Open menu" }).click();
await page.screenshot({ path: out });
await browser.close();
