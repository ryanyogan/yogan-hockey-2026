import { expect, test } from "@playwright/test";

// Fixture mode: Toronto (21) is the recorded team, Auston Matthews its recorded player, and
// Nashville at Toronto the second of the recorded slate's nine games by start.

test("a player and a team are made favorites, kept over a reload, and let go", async ({ page }) => {
  const site = page.getByRole("navigation", { name: "Site" });
  const ticker = page.getByRole("navigation", { name: "Scores" });
  const playerHeart = page.getByRole("button", { name: "Favorite Auston Matthews" });
  const teamHeart = page.getByRole("button", { name: "Favorite Toronto Maple Leafs" });

  await page.goto("/nhl/teams/21?tab=roster");

  // A heart on his roster row and one on the team's header. A click before the page has
  // hydrated does nothing, so each is pressed until it takes.
  for (const heart of [playerHeart, teamHeart]) {
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(async () => {
      if ((await heart.getAttribute("aria-pressed")) === "false") await heart.click();
      await expect(heart).toHaveAttribute("aria-pressed", "true", { timeout: 1000 });
    }).toPass();
  }
  // The heart took the click: the row's link did not open his page.
  await expect(page).toHaveURL(/\/nhl\/teams\/21\?tab=roster$/);

  // The favorite team's game leads the ticker on every page...
  await expect(ticker.getByRole("listitem").first()).toContainText(/NSH.+TOR/);
  await expect(ticker.getByRole("listitem").first()).toContainText("favorite team");

  // ...and its section of /nhl/live, where the note column says why.
  await ticker.getByRole("link", { name: "scores" }).click();
  const upcoming = page.getByRole("region", { name: "Upcoming" });
  await expect(upcoming.getByRole("row").nth(1)).toContainText("NSH at TOR");
  await expect(upcoming.getByRole("row").nth(1)).toContainText("favorite team");
  await expect(upcoming.getByText("favorite team")).toHaveCount(1);

  // /players lists him with his team and his season, and still does after a reload.
  await site.getByRole("link", { name: "players" }).click();
  const favorites = page.getByRole("region", { name: "Favorites" });
  const row = favorites.getByRole("row").filter({ hasText: "Auston Matthews" });
  await expect(row).toContainText("TOR");
  await expect(row).toContainText(/\d+ GP · \d+ G · \d+ A · \d+ PTS/);
  await page.reload();
  await expect(row).toBeVisible();
  await expect(favorites).toContainText("1 player");
  await expect(row.getByRole("button")).toHaveAttribute("aria-pressed", "true");

  // His page has the same heart, filled; pressing it lets him go.
  await row.getByRole("link").click();
  await expect(page).toHaveURL(/\/players\/4024123$/);
  await expect(playerHeart).toHaveAttribute("aria-pressed", "true");
  await playerHeart.click();
  await expect(playerHeart).toHaveAttribute("aria-pressed", "false");

  // And so the team, from its own page.
  await page.getByRole("link", { name: "Toronto Maple Leafs" }).first().click();
  await expect(teamHeart).toHaveAttribute("aria-pressed", "true");
  await teamHeart.click();
  await expect(teamHeart).toHaveAttribute("aria-pressed", "false");
  await expect(ticker.getByRole("listitem").first()).toContainText(/CAR.+MTL/);
  await expect(ticker).not.toContainText("favorite team");

  await site.getByRole("link", { name: "players" }).click();
  await expect(favorites).toContainText("No favorite players yet");
  expect(
    await page.evaluate(() => [
      localStorage.getItem("favorite_players"),
      localStorage.getItem("favorite_teams"),
    ]),
  ).toEqual(["[]", "[]"]);
});
