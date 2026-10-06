import { expect, test } from "@playwright/test";
import { driveGame, recordedGame, SCHEDULED_GAME } from "./game-driver";

// A visitor outside Eastern time: the start is shown in his own zone.
test.use({ timezoneId: "America/Chicago" });

test("a game page goes from scheduled to live, an intermission and the final without a reload", async ({
  page,
  browser,
  baseURL,
}) => {
  // Nashville at Toronto is still to be played; the recorded shootout is played on its page.
  const game = await recordedGame(baseURL as string);
  const driver = await driveGame(page, SCHEDULED_GAME);
  const endOfFirst = game.plays.findIndex((play) => play.type === "period-end");
  const state = (header: typeof game.final, over = {}) => ({
    header,
    delayed: false,
    archived: false,
    ...over,
  });

  await page.goto(`/nhl/games/${SCHEDULED_GAME}`);
  await page.evaluate(() => Object.assign(window, { openedOnce: true }));

  // Scheduled: the matchup over empty ice, the start in the visitor's zone, the pick's slot, and
  // the matchup facts. No socket to the Game Agent, which would make it poll.
  await expect(page).toHaveTitle(/^NSH at TOR/);
  const status = page.locator('[data-slot="rink-status"]');
  await expect(page.locator('[data-slot="rink-team"]')).toHaveText([/away.*NSH/, /home.*TOR/]);
  await expect(status).toHaveText(/Tue Oct 6.*6:00 PM$/);
  await expect(page.locator('[data-slot="game-pick"]')).toContainText("Toronto Maple Leafs 58%.");
  await expect(page.getByRole("heading", { name: /Matchup/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Goalies/ })).toBeVisible();
  expect(driver.agentSockets()).toBe(0);

  // The Scoreboard reports the game live: the page opens the Game Stream by itself.
  driver.agent(state(game.liveAfter(60, 1)), game.plays.slice(0, 60));
  await driver.scoreboard({ status: "live", period: 1, clock: "12:34" });
  await expect(status).toHaveText(/live.*1st 12:34$/i);
  expect(driver.agentSockets()).toBe(1);
  await expect(page.locator('[data-slot="rink-score"]').first()).toContainText("NSH");
  await expect(page.locator('[data-slot="game-matchup"]')).toHaveCount(0);

  // It opens on key plays, with a toggle for every play.
  const rows = page.locator('[data-slot="play-row"]');
  const keyPlays = await rows.count();
  expect(keyPlays).toBeGreaterThan(0);
  expect(keyPlays).toBeLessThan(60);
  await page.locator("label", { hasText: /^every play/ }).click();
  await expect(rows).toHaveCount(60);
  await expect(page.getByRole("navigation", { name: "Game" }).getByRole("link")).toHaveText([
    "plays",
    "scoring",
    "the pick",
  ]);

  // The period ends: the stream stays on and shows the break. Then the next period starts with
  // one added play, and the clock is the Scoreboard's again.
  driver.agent(state(game.liveAfter(endOfFirst + 1, 1)), game.plays.slice(0, endOfFirst + 1));
  await expect(status).toHaveText(/live.*End of 1st$/i);
  await expect(rows).toHaveCount(endOfFirst + 1);
  driver.message({ type: "cf_agent_state", state: state(game.liveAfter(endOfFirst + 2, 2)) });
  driver.message({ type: "play-added", index: endOfFirst + 1, play: game.plays[endOfFirst + 1] });
  await driver.scoreboard({ period: 2, clock: "19:58" });
  await expect(status).toHaveText(/live.*2nd 19:58$/i);
  await expect(rows).toHaveCount(endOfFirst + 2);

  // The Agent reports a stall.
  driver.message({
    type: "cf_agent_state",
    state: state(game.liveAfter(endOfFirst + 2, 2), { delayed: true }),
  });
  await expect(page.locator('[data-slot="rink-notice"]')).toHaveText("Updates delayed");

  // The final: the finished game's plays as received, on the same open page.
  driver.agent(state(game.final), game.plays);
  await driver.scoreboard({ status: "final", period: 5 });
  await expect(status).toHaveText("Final/SO");
  await expect(page.locator('[data-slot="rink-notice"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="rink-score"]')).toHaveText([/NSH.*4/, /TOR.*3/]);
  driver.agent(state(game.final, { archived: true }), game.plays);
  await expect(rows.first()).toBeVisible();
  expect(await page.evaluate(() => "openedOnce" in window)).toBe(true);
  expect(driver.agentSockets()).toBe(1);

  // A game that was over when it was opened is laid out for browsing, and an id that is no
  // game's is the not-found page inside the shell.
  const over = await (await browser.newContext()).newPage();
  await over.goto("/nhl/games/401803652");
  await expect(over).toHaveTitle(/^DAL at BUF/);
  await expect(over.locator('[data-slot="rink-status"]')).toHaveText("Final/SO");
  await expect(over.locator('[data-slot="play-row"]')).toHaveCount(74);

  const missing = await (await browser.newContext()).newPage();
  const response = await missing.goto("/nhl/games/not-a-game");
  expect(response?.status()).toBe(404);
  await expect(missing.getByRole("heading", { name: /Game not found/ })).toBeVisible();
  await expect(missing.getByRole("navigation", { name: "Scores" })).toBeVisible();
});
