import { expect, test } from "@playwright/test";

const DARK_BACKGROUND = "rgb(15, 23, 42)";
const LIGHT_BACKGROUND = "rgb(251, 250, 247)";

test("the shell renders, switches theme, and its phone menu closes on navigation", async ({
  page,
}) => {
  // The operating system asks for dark, and the visitor has not chosen yet.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  // Desktop: the sidebar, with the wordmark leading home and the places in order.
  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByRole("link", { name: "YOGAN/HOCKEY" })).toHaveAttribute("href", "/");
  await expect(sidebar.getByRole("navigation", { name: "Site" }).getByRole("link")).toHaveText([
    "standings",
    "teams",
    "players",
    "family",
    "live scores",
  ]);
  await expect(page.getByRole("contentinfo")).toContainText("ESPN");
  await expect(page.locator('[data-slot="score-ticker"]')).toBeAttached();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();

  // The theme follows the operating system until the visitor chooses, then keeps the choice.
  const body = page.locator("body");
  await expect(body).toHaveCSS("background-color", DARK_BACKGROUND);
  // A press before the page has hydrated does nothing, so press until one lands.
  await expect(async () => {
    await sidebar.getByRole("button", { name: /^(dark|light) mode$/ }).click();
    await expect(body).toHaveCSS("background-color", LIGHT_BACKGROUND, { timeout: 1000 });
  }).toPass();
  await page.reload();
  await expect(body).toHaveCSS("background-color", LIGHT_BACKGROUND);

  // Phone: the sidebar gives way to a top bar whose menu closes when a link is followed.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await menu.getByRole("link", { name: "players" }).click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(menu).toBeHidden();

  // The top bar carries the toggle on a phone, so both themes are reachable there too.
  const topBar = page.getByRole("banner");
  await topBar.getByRole("button", { name: /^(dark|light) mode$/ }).click();
  await expect(body).toHaveCSS("background-color", DARK_BACKGROUND);

  // An unknown path gets the not-found page, inside the shell.
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(topBar.getByRole("link", { name: "YOGAN/HOCKEY" })).toBeVisible();
});
