// Screenshots of the Replay, for docs/design/replay.
//
//   node scripts/replay-shots.ts [baseURL] [outDir]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes). It
// opens the recorded shootout (401803652) and saves the Replay as opened, playing in the middle
// of the 2nd, and stopped at the end after playing through the shootout, in light and dark at
// 1440 and 390.
import { chromium } from "@playwright/test";

const [baseURL = "http://localhost:5251", outDir = "docs/design/replay"] = process.argv.slice(2);

const browser = await chromium.launch();
for (const scheme of ["light", "dark"] as const) {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme });
    const shot = (name: string) =>
      page.screenshot({ path: `${outDir}/${name}-${scheme}-${width}.png`, fullPage: true });
    const transport = page.locator('[data-slot="replay-transport"]');
    const playing = (value: boolean) =>
      page.locator(`[data-slot="replay-transport"][data-playing="${value}"]`).waitFor();
    // Ticks crowd each other at phone width, so a click goes to the tick itself.
    const jumpTo = (label: string) =>
      page.locator(`[data-slot="timeline-tick"][aria-label^="${label}"]`).dispatchEvent("click");

    await page.goto(`${baseURL}/nhl/games/401803652`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await transport.waitFor();
    await page.waitForTimeout(400);
    await shot("opened");

    // Mid-play: from Dallas's tying goal in the 2nd, playing.
    await jumpTo("2nd 4:24 ");
    await page.getByRole("button", { name: "Play the replay" }).click();
    await playing(true);
    // A step on, so the shot is of a Replay that has moved by itself.
    const position = page.locator('[data-slot="replay-position"]');
    const from = await position.textContent();
    await page.waitForFunction(
      (was) => document.querySelector('[data-slot="replay-position"]')?.textContent !== was,
      from,
    );
    await shot("playing");

    // The end: play through the last of the shootout at 4x until it stops by itself.
    await page.locator('[data-slot="replay-speed"] label', { hasText: "4x" }).click();
    await page.locator('[data-slot="timeline-tick"]').last().dispatchEvent("click");
    await playing(false);
    await page.waitForTimeout(400);
    await shot("end");
    await page.close();
  }
}
await browser.close();
