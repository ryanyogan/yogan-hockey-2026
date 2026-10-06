// Screenshots of the pick, for docs/design/picks.
//
//   node scripts/picks-shots.ts [baseURL] [outDir]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes). It
// seeds the sample picks through /skeleton/picks, then saves the dashboard with its picks and
// season record, the scheduled game page's pick, and the Replay's pick tab marked right and then
// (seeded again) wrong, in light and dark at 1440 and 390. It leaves the final's pick right.
import { chromium, type Page } from "@playwright/test";

const [baseURL = "http://localhost:5253", outDir = "docs/design/picks"] = process.argv.slice(2);

async function seed(page: Page, final: "right" | "wrong") {
  await page.goto(`${baseURL}/skeleton/picks`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Seed picks, the final's ${final}` }).click();
  await page.locator('[data-slot="picks-seeded"]', { hasText: `pick is ${final}` }).waitFor();
}

const browser = await chromium.launch();
for (const final of ["right", "wrong"] as const) {
  const seeder = await browser.newPage();
  await seed(seeder, final);
  await seeder.close();
  for (const scheme of ["light", "dark"] as const) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        colorScheme: scheme,
        timezoneId: "America/Toronto",
      });
      const shot = async (name: string, path: string, waitFor: string) => {
        await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.locator(waitFor).first().waitFor();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${outDir}/${name}-${scheme}-${width}.png`, fullPage: true });
      };
      if (final === "right") {
        await shot("dashboard", "/", '[data-slot="picks-record"]');
        await shot("scheduled", "/nhl/games/401892449", '[data-slot="game-pick-full"]');
      }
      await shot(
        `replay-${final}`,
        "/nhl/games/401803652?tab=pick",
        `[data-slot="pick-outcome"][data-outcome="${final}"]`,
      );
      await page.close();
    }
  }
}
const seeder = await browser.newPage();
await seed(seeder, "right");
await browser.close();
