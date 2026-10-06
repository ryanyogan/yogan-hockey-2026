import { expect, test as setup } from "@playwright/test";

// Runs before every spec (the `setup` project in playwright.config.ts). Locally no model can make
// a pick, so each game of the recorded slate would say "pick pending" and then, once its
// Prediction had failed, nothing: the note of a game row would depend on when a spec looked.
// `/skeleton/picks` writes sample rows instead: a pick for every game but one, a failed
// Prediction for that one, a pick for the recorded final, and five decided games.
setup("seed the sample picks", async ({ page }) => {
  await page.goto("/skeleton/picks");
  await expect(async () => {
    await page.getByRole("button", { name: "Seed picks, the final's right" }).click();
    await expect(page.locator('[data-slot="picks-seeded"]')).toHaveText(/pick is right/, {
      timeout: 5_000,
    });
  }).toPass();
});
