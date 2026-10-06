import { expect, test } from "@playwright/test";

// The sample route draws the recorded shootout, Dallas 4 at Buffalo 3 (event 401803652).
test("the sample game draws the rink, switches to every play, and a tick picks a play", async ({
  page,
}) => {
  await page.goto("/skeleton/game");

  // The rink, with the score laid over it and a dot for each key play that has a place.
  const rink = page.getByRole("img", { name: /^The rink/ });
  await expect(rink).toBeVisible();
  await expect(page.locator('[data-slot="rink-score"]')).toHaveText([/DAL.*4/, /BUF.*3/]);
  await expect(page.locator('[data-slot="rink-status"]')).toHaveText("Final/SO");
  await expect(rink.locator('[data-slot="rink-mark"]')).toHaveCount(64);

  // The page opens on key plays; the toggle shows every play, in the list and on the timeline.
  const rows = page.locator('[data-slot="play-row"]');
  const ticks = page.locator('[data-slot="timeline-tick"]');
  await expect(rows).toHaveCount(74);
  // A press before the page has hydrated does nothing, so press until one lands.
  await expect(async () => {
    await page.locator("label", { hasText: /^every play/ }).click();
    await expect(rows).toHaveCount(307, { timeout: 1000 });
  }).toPass();
  await expect(ticks).toHaveCount(307);
  await page.locator("label", { hasText: /^key plays/ }).click();
  await expect(rows).toHaveCount(74);

  // Goals stand taller on the timeline, and a penalty has its own mark.
  const goalTick = page.getByRole("button", { name: /^1st 2:19 Mavrik Bourque Goal/ });
  const plainTick = ticks.and(page.locator('[data-kind="save"]')).first();
  const goalHeight = (await goalTick.boundingBox())?.height ?? 0;
  expect(goalHeight).toBeGreaterThan((await plainTick.boundingBox())?.height ?? 0);
  await expect(ticks.and(page.locator('[data-kind="penalty"]'))).toHaveCount(6);

  // Clicking a tick rings that play on the ice, captions it and tints its row.
  await goalTick.click();
  const ringed = rink.locator('[data-slot="rink-mark"][data-focused]');
  await expect(ringed).toHaveAttribute("data-kind", "goal");
  await expect(ringed).toHaveAttribute("cx", "-87");
  await expect(page.locator('[data-slot="rink-caption"]:visible')).toContainText(
    "GOAL · Mavrik Bourque Goal",
  );
  const row = rows.filter({ hasText: "Mavrik Bourque Goal" });
  await expect(row).toHaveAttribute("aria-pressed", "true");

  // Clicking a play in the list does the same, and the pick survives a change of tab.
  await rows.filter({ hasText: "Josh Norris Goal (13)" }).click();
  await expect(ringed).toHaveAttribute("cx", "61");
  await page.getByRole("link", { name: "scoring" }).click();
  await expect(page.getByRole("heading", { name: "Shootout" })).toBeVisible();
  await expect(page.locator('[data-slot="play-row"]')).toHaveCount(11);
  await expect(ringed).toHaveAttribute("cx", "61");
});
