import { expect, test } from "./test";

// Fixture mode: the figures are of the sample picks `picks.setup.ts` seeded (3 right and 2 wrong
// on the season, 2 of 3 on the Monday of the recorded slate's week) and the columns are the three
// samples seeded with them. Every figure and its edge cases are proved in Vitest
// (`apps/web/lib/picks-figures.test.ts`, `picks-page.test.ts`).
test("the Picks page is in the masthead, and has its figures, tonight's picks and its columns in the page as it is sent", async ({
  page,
}) => {
  const sent = await (await page.request.get("/picks")).text();
  expect(sent).toContain("<title>Picks · Yogan Hockey</title>");
  expect(sent.match(/data-slot="picks-stat"/g)).toHaveLength(3);
  expect(sent.match(/data-slot="brief"/g)).toHaveLength(9);
  expect(sent.match(/data-slot="piece"/g)).toHaveLength(3);

  await page.goto("/");
  await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Picks" }).click();
  await expect(page).toHaveURL("/picks");
  await expect(page).toHaveTitle("Picks · Yogan Hockey");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Picks");
  await expect(
    page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Picks" }),
  ).toHaveAttribute("aria-current", "page");

  const figures = page.getByRole("region", { name: "This week in figures" });
  await expect(figures.locator('[data-slot="picks-stat"] dd')).toHaveText(["2⁠–⁠1", "2", "3⁠–⁠2"]);
  await expect(figures.locator('[data-slot="picks-call"]').first()).toContainText(
    "The Carolina Hurricanes, picked at 78% on the road",
  );

  const tonight = page.getByRole("region", { name: "Tonight's picks" });
  const toronto = tonight.getByRole("listitem").filter({ hasText: "Nashville at Toronto" });
  await expect(toronto.locator('[data-slot="brief-pick"]')).toHaveText("TOR 58%");
  await expect(toronto.getByRole("link")).toHaveAttribute("href", "/nhl/games/401892449");

  const columns = page.getByRole("region", { name: "From the picks desk" });
  await expect(columns.locator('[data-slot="piece-kicker"]')).toHaveText([
    "Tonight's game · Tue Oct 6",
    "The miss · Tue Oct 6",
    "The record · Tue Oct 6",
  ]);
  await columns.getByRole("link").first().click();
  await expect(page).toHaveURL("/pieces/2026-10-06-picks-tonight");
  await expect(page.locator('[data-slot="piece-byline"]')).toContainText("Written by a model");
});
