// Screenshots of the game page in each of its states, for docs/design/game-page.
//
//   node scripts/game-page-shots.ts [baseURL] [outDir]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes). It
// drives one open page through the states with the smoke test's driver (e2e/game-driver.ts) and
// saves each in light and dark at 1440 and 390.
import { chromium } from "@playwright/test";
import { driveGame, recordedGame, SCHEDULED_GAME } from "../e2e/game-driver.ts";

const [baseURL = "http://localhost:5250", outDir = "docs/design/game-page"] = process.argv.slice(2);
const game = await recordedGame(baseURL);
const endOfSecond = game.plays.findLastIndex(
  (play) => play.type === "period-end" && play.period === 2,
);
const midSecond = endOfSecond - 40;
const state = (header: typeof game.final, delayed = false) => ({
  header,
  delayed,
  archived: false,
});

const browser = await chromium.launch();
for (const scheme of ["light", "dark"] as const) {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      colorScheme: scheme,
      timezoneId: "America/Chicago",
    });
    const shot = async (name: string) => {
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${outDir}/${name}-${scheme}-${width}.png`, fullPage: true });
    };
    const driver = await driveGame(page, SCHEDULED_GAME);
    await page.goto(`${baseURL}/nhl/games/${SCHEDULED_GAME}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await shot("scheduled");

    driver.agent(state(game.liveAfter(midSecond, 2)), game.plays.slice(0, midSecond));
    await driver.scoreboard({
      status: "live",
      period: 2,
      clock: "8:12",
      scores: game.liveAfter(midSecond, 2),
    });
    await page.locator('[data-slot="game-view"]').waitFor();
    await shot("live");

    driver.agent(state(game.liveAfter(midSecond, 2), true), game.plays.slice(0, midSecond));
    await page.locator('[data-slot="rink-notice"]').waitFor();
    await shot("delayed");

    driver.agent(state(game.liveAfter(endOfSecond + 1, 2)), game.plays.slice(0, endOfSecond + 1));
    await page.locator('[data-slot="rink-status"]').filter({ hasText: "End of 2nd" }).waitFor();
    await shot("intermission");

    driver.agent(state(game.final), game.plays);
    await driver.scoreboard({ status: "final", period: 5, scores: game.final });
    await page.locator('[data-slot="rink-status"]').filter({ hasText: "Final/SO" }).waitFor();
    await shot("final");
    await page.close();
  }
}
await browser.close();
