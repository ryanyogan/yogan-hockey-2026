import { expect, test } from "./test";

// The recorded shootout, Dallas 4 at Buffalo 3 (event 401803652): a finished game nobody watched,
// so this page's first open is what archives it, and the Replay is drawn from D1.
test("the Replay opens laid out, plays, pauses, jumps to a tick, and follows the key-plays toggle", async ({
  page,
}) => {
  await page.goto("/nhl/games/401803652");

  // Opened for browsing: the whole game, with the final score.
  const rink = page.getByRole("img", { name: /^The rink/ });
  const score = page.locator('[data-slot="rink-score"]');
  const status = page.locator('[data-slot="rink-status"]');
  const rows = page.locator('[data-slot="play-row"]');
  const ticks = page.locator('[data-slot="timeline-tick"]');
  const upcoming = page.locator('[data-slot="timeline-tick"][data-upcoming]');
  const transport = page.locator('[data-slot="replay-transport"]');
  const position = page.locator('[data-slot="replay-position"]');
  await expect(rink).toBeVisible();
  await expect(score).toHaveText([/DAL.*4/, /BUF.*3/]);
  await expect(status).toHaveText("Final/SO");
  await expect(rink.locator('[data-slot="rink-mark"]')).toHaveCount(64);
  await expect(rows).toHaveCount(74);
  // A tick for each key play, and one for the play in focus: the game's end.
  await expect(ticks).toHaveCount(75);
  await expect(upcoming).toHaveCount(0);
  await expect(position).toContainText("The whole game");

  // Goals stand taller on the timeline, and a penalty has its own mark.
  const firstGoal = ticks.and(page.locator('[aria-label^="1st 2:19 Mavrik Bourque Goal"]'));
  const plainTick = ticks.and(page.locator('[data-kind="save"]')).first();
  const goalHeight = (await firstGoal.boundingBox())?.height ?? 0;
  expect(goalHeight).toBeGreaterThan((await plainTick.boundingBox())?.height ?? 0);
  await expect(ticks.and(page.locator('[data-kind="penalty"]'))).toHaveCount(6);

  // Play starts again from the first play: no score, and the rest of the game still to come.
  // A press before the page has hydrated does nothing, so press until one lands.
  await expect(async () => {
    await page.locator('[data-slot="replay-speed"] label', { hasText: "4x" }).click();
    await page.getByRole("button", { name: "Play the replay" }).click({ timeout: 1000 });
    await expect(transport).toHaveAttribute("data-playing", "true", { timeout: 1000 });
  }).toPass();
  await expect(position).toHaveText(/^key play \d+ of 74$/);
  await expect(ticks).toHaveCount(74);

  // It steps on by itself: the playhead reaches Dallas's first goal and the score follows.
  await expect(score).toHaveText([/DAL.*[1-3]/, /BUF.*[0-3]/]);
  await expect(status).not.toHaveText("Final/SO");

  // Pause holds it.
  await page.getByRole("button", { name: "Pause the replay" }).click();
  await expect(transport).toHaveAttribute("data-playing", "false");
  const held = await position.textContent();
  const heldRows = await rows.count();
  expect(heldRows).toBeLessThan(74);
  await page.waitForTimeout(1500);
  await expect(position).toHaveText(held ?? "");
  await expect(rows).toHaveCount(heldRows);

  // The penalty before it puts its player in the box, and Dallas on the power play.
  const box = page.locator('[data-slot="penalty-box"]');
  await ticks.and(page.locator('[aria-label^="2nd 2:24 Jordan Greenway"]')).click();
  await expect(box.locator('[data-slot="boxed-penalty"]')).toHaveText(
    /BUF\s*J\. Greenway\s*Interference.*2:00/,
  );
  await expect(box.locator('[data-slot="power-play"]')).toHaveText(
    /DAL power play · 5 on 4 · 2:00/,
  );
  await expect(rink.locator('[data-slot="rink-power-play-zone"][data-on]')).toHaveCount(1);

  // Clicking a tick moves the playhead there: Dallas's tying goal in the 2nd, not yet reached.
  const tyingGoal = ticks.and(page.locator('[aria-label^="2nd 4:24 "]'));
  await expect(tyingGoal).toHaveAttribute("data-upcoming", "true");
  await tyingGoal.click();
  // Scored as the penalty ran out: nobody is left in the box and the ice is clear.
  await expect(box).toContainText("Nobody in the box");
  await expect(rink.locator('[data-slot="rink-power-play-zone"][data-on]')).toHaveCount(0);
  await expect(score).toHaveText([/DAL.*2/, /BUF.*2/]);
  await expect(status).toHaveText("2nd 4:24");
  await expect(tyingGoal).not.toHaveAttribute("data-upcoming");
  await expect(rink.locator('[data-slot="rink-mark"][data-focused]')).toHaveAttribute(
    "data-kind",
    "goal",
  );
  await expect(rows.first()).toHaveAttribute("aria-pressed", "true");
  // The goal is played on the ice: its line is drawn, in the goal's colour.
  const drawn = rink.locator('[data-slot="rink-fx"]');
  await expect(drawn).toHaveAttribute("data-kind", "goal");
  await expect(drawn).toHaveCSS("opacity", "1");
  // And its sequence with it: the lamp behind the net it went into, and the scorer named.
  const lamp = rink.locator('[data-slot="rink-lamp"][data-lit]');
  await expect(lamp).toHaveAttribute("data-end", "right");
  await expect(page.locator('[data-slot="goal-scorer"]').first()).toContainText("Esa Lindell (6)");
  const keyRows = await rows.count();
  expect(keyRows).toBeLessThan(74);

  // The key-plays toggle changes the list, and what a step counts, without moving the playhead.
  await page.locator("label", { hasText: /^every play/ }).click();
  await expect(rows).toHaveCount(118);
  await expect(position).toHaveText("play 118 of 307");
  await expect(ticks).toHaveCount(307);
  await expect(score).toHaveText([/DAL.*2/, /BUF.*2/]);
  await page.locator("label", { hasText: /^key plays/ }).click();
  await expect(rows).toHaveCount(keyRows);

  // Clicking a play in the list goes back to it, and the scoring tab follows the playhead too.
  await rows.filter({ hasText: "Mavrik Bourque Goal" }).click();
  await expect(score).toHaveText([/DAL.*1/, /BUF.*0/]);
  await rink.evaluate((node) => node.setAttribute("data-retained", "yes"));
  // A tab is the game already read: going to one asks the server for nothing.
  const reads: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/_serverFn/")) reads.push(request.url());
  });
  await page.getByRole("link", { name: "scoring" }).click();
  await expect(page).toHaveURL(/\/nhl\/games\/401803652\/scoring$/);
  await expect(rink).toHaveAttribute("data-retained", "yes");
  await expect(page.locator('[data-slot="play-row"]')).toHaveCount(1);
  await expect(score).toHaveText([/DAL.*1/, /BUF.*0/]);

  // The pick's tab, with the seeded pick (`e2e/picks.setup.ts`), and back: the same rink still.
  await page.getByRole("link", { name: "the pick" }).click();
  await expect(page).toHaveURL(/\/nhl\/games\/401803652\/pick$/);
  await expect(page.locator('[data-slot="pick-lead"]')).toContainText("Our pick:");
  await page.getByRole("link", { name: "scoring" }).click();
  await expect(page).toHaveURL(/\/nhl\/games\/401803652\/scoring$/);
  await expect(rink).toHaveAttribute("data-retained", "yes");
  await expect(score).toHaveText([/DAL.*1/, /BUF.*0/]);
  expect(reads).toEqual([]);

  // Back to the whole game.
  await page.getByRole("button", { name: "whole game" }).click();
  await expect(score).toHaveText([/DAL.*4/, /BUF.*3/]);
  await expect(status).toHaveText("Final/SO");
  // Nothing of the last play stepped onto is left on the ice.
  await expect(drawn).toHaveCSS("opacity", "0");
  await expect(lamp).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Shootout" })).toBeVisible();
  await expect(page.locator('[data-slot="play-row"]')).toHaveCount(11);
});
