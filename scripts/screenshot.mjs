// Takes one screenshot for a side-by-side comparison against the Reference UI.
// Usage: node scripts/screenshot.mjs <url> <out.png> <width> [light|dark] [height] [--menu]
//          [--store=key=value ...] [--eval=expression]
// --store puts a value in localStorage before the page loads, which is how a shot gets
// favorites: --store='favorite_players=["4024123"]' --store='favorite_teams=["21"]'.
// --eval prints what an expression evaluates to in the page, as JSON: for measuring.
import { chromium } from "@playwright/test";

const flags = process.argv.slice(2).filter((arg) => arg.startsWith("--"));
const [url, out, width = "1440", scheme = "light", height = "900"] = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--"));
const openMenu = flags.includes("--menu");
const afterEquals = (flag) => flag.slice(flag.indexOf("=") + 1);
const stored = flags.filter((flag) => flag.startsWith("--store=")).map(afterEquals);
const expression = flags.filter((flag) => flag.startsWith("--eval=")).map(afterEquals)[0];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  colorScheme: scheme,
});
for (const pair of stored) {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [pair.slice(0, pair.indexOf("=")), afterEquals(pair)],
  );
}
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
if (openMenu) await page.getByRole("button", { name: "Open menu" }).click();
if (expression) console.log(JSON.stringify(await page.evaluate(expression)));
await page.screenshot({ path: out });
await browser.close();
