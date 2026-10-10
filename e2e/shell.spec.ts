import { expect, test } from "@playwright/test";

const DARK_BACKGROUND = "rgb(16, 23, 35)";
const LIGHT_BACKGROUND = "rgb(250, 250, 250)";

test("the shared header keeps every page visible on phones, remembers theme and survives navigation", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  const header = page.getByRole("banner");
  const nav = header.getByRole("navigation", { name: "Site" });
  await expect(header.getByRole("link", { name: "YOGAN/HOCKEY" })).toHaveAttribute("href", "/");
  await expect(nav.getByRole("link")).toHaveText([
    "Home",
    "Scores",
    "Standings",
    "Teams",
    "Players",
  ]);
  await expect(page.getByRole("contentinfo")).toContainText("ESPN");
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveCount(0);
  const body = page.locator("body");
  // Light is the approved default, even when the OS asks for dark.
  await expect(body).toHaveCSS("background-color", LIGHT_BACKGROUND);
  await expect(async () => {
    await header.getByRole("button", { name: "dark mode" }).click();
    await expect(body).toHaveCSS("background-color", DARK_BACKGROUND, { timeout: 1000 });
  }).toPass();
  await page.reload();
  await expect(body).toHaveCSS("background-color", DARK_BACKGROUND);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const link of await nav.getByRole("link").all())
    await expect(link).toBeInViewport({ ratio: 1 });
  // vinext rebuilds its not-found fallback on the way back to a real route.
  await nav.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hockey, at a glance" })).toBeVisible();
  // A browser-only marker is lost if the persistent shell remounts.
  await header.evaluate((node) => node.setAttribute("data-persistence-check", "kept"));
  await nav.getByRole("link", { name: "Players", exact: true }).click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(header).toHaveAttribute("data-persistence-check", "kept");
  await expect(nav.getByRole("link", { name: "Players", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await header.getByRole("button", { name: "light mode" }).click();
  await expect(body).toHaveCSS("background-color", LIGHT_BACKGROUND);
  // Retired public routes have no special data or redirects left behind.
  for (const path of [
    "/family/rylan",
    "/yogan",
    "/players/rylan-yogan",
    "/players/easter-egg-rylan-yogan",
  ]) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
});
