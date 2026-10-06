import { expect, test } from "@playwright/test";

// Fixture mode answers one search, "mar", and two players: Auston Matthews and a goalie.

test("/players searches as the visitor types and keeps the search in the URL", async ({ page }) => {
  await page.goto("/players");
  await expect(page).toHaveTitle("Players · Yogan Hockey");
  await expect(page.getByRole("heading", { name: "Favorites" })).toBeVisible();

  const box = page.getByRole("searchbox", { name: "player name" });
  const results = page.getByRole("table").getByRole("link");
  // Typing before the page has hydrated searches for nothing, so type until a search lands.
  await expect(async () => {
    await box.fill("");
    await box.pressSequentially("mar");
    await expect(results).toHaveCount(10, { timeout: 2000 });
  }).toPass();

  // Each result names the player, his position and his team, and leads to his page.
  const first = page.getByRole("row").filter({ hasText: "Brad Marchand" });
  await expect(first).toContainText("LW");
  await expect(first).toContainText("FLA");
  await expect(first.getByRole("link")).toHaveAttribute("href", "/players/3852");

  // The box was typed in throughout: a search does not start it anew.
  await expect(box).toBeFocused();

  // The search is in the URL, so the server renders the same results on a reload.
  await expect(page).toHaveURL(/\/players\?q=mar$/);
  await page.reload();
  await expect(box).toHaveValue("mar");
  await expect(results).toHaveCount(10);

  // Arriving by a link starts the box from that link's URL.
  await expect(async () => {
    await page.getByRole("complementary").getByRole("link", { name: "players" }).click();
    await expect(box).toHaveValue("", { timeout: 1000 });
  }).toPass();
  await expect(page).toHaveURL(/\/players$/);
  await expect(results).toHaveCount(0);
});

test("/players/:id shows a player's season, games and career", async ({ page }) => {
  await page.goto("/players/4024123");
  await expect(page).toHaveTitle("Auston Matthews · Yogan Hockey");

  const header = page.locator('[data-slot="player-header"]');
  await expect(header.getByRole("heading", { name: /Auston Matthews/ })).toContainText("#34");
  await expect(header.getByRole("link", { name: "Toronto Maple Leafs" })).toHaveAttribute(
    "href",
    "/nhl/teams/21",
  );
  await expect(header).toContainText("San Ramon, CA");

  await expect(page.getByRole("heading", { name: /^Season/ })).toContainText("2026-27");
  // The log's rows lead to their games.
  await expect(page.getByRole("heading", { name: /^Games/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Oct 3" })).toHaveAttribute(
    "href",
    "/nhl/games/401892434",
  );
  await expect(page.getByRole("heading", { name: /^Career/ })).toContainText("11 seasons");
  await expect(page.getByRole("row").filter({ hasText: "career" })).toContainText("781");
});
