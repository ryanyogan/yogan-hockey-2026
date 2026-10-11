import { expect, test } from "@playwright/test";

const DARK_BACKGROUND = "rgb(15, 23, 42)";
const LIGHT_BACKGROUND = "rgb(251, 250, 247)";

test("the shell renders, switches theme, and its phone menu closes on navigation", async ({
  page,
}) => {
  // The operating system asks for dark, and the visitor has not chosen yet.
  await page.emulateMedia({ colorScheme: "dark" });
  // An unknown path gets the not-found page inside the shell, so the shell is checked there.
  // (One hard navigation only: on a cold dev server a second one, made while the first page's
  // modules are still loading, crashes the page.)
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();

  // Desktop: the sidebar, with the wordmark leading home and the places in order.
  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByRole("link", { name: "YOGAN/HOCKEY" })).toHaveAttribute("href", "/");
  // Each place is numbered for the eye; its name is the place alone.
  const places = sidebar.getByRole("navigation", { name: "Site" }).getByRole("link");
  await expect(places).toHaveCount(5);
  for (const [index, name] of ["Home", "Scores", "Standings", "Teams", "Players"].entries())
    await expect(places.nth(index)).toHaveAccessibleName(name);
  // Today's slate at a glance, from the page's one Scoreboard socket, leading to the scores.
  await expect(sidebar.getByRole("link", { name: /^Scores: 9 games, 9 to come$/ })).toHaveAttribute(
    "href",
    "/nhl/live",
  );
  // The sidebar's first rule is the score strip's, carried across.
  const ruleUnder = (slot: string) =>
    page.locator(`[data-slot="${slot}"]`).evaluate((node) => node.getBoundingClientRect().bottom);
  expect(await ruleUnder("sidebar-head")).toBe(await ruleUnder("score-ticker"));
  await expect(page.getByRole("contentinfo")).toContainText("ESPN");
  await expect(page.locator('[data-slot="score-ticker"]')).toBeAttached();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();

  // The theme follows the operating system until the visitor chooses, then keeps the choice.
  const body = page.locator("body");
  await expect(body).toHaveCSS("background-color", DARK_BACKGROUND);
  // The browser's own bars take the colour of the page shown: the operating system's theme
  // until the visitor chooses, then the choice, though the operating system still asks for dark.
  const barColors = page.locator('meta[name="theme-color"]');
  await expect(barColors).toHaveCount(2);
  await expect(page.locator('meta[name="theme-color"][media*="dark"]')).toHaveAttribute(
    "content",
    "#0f172a",
  );
  // A press before the page has hydrated does nothing, so press until one lands.
  await expect(async () => {
    await sidebar
      .getByRole("group", { name: "Theme" })
      .getByRole("button", { name: "light" })
      .click();
    await expect(body).toHaveCSS("background-color", LIGHT_BACKGROUND, { timeout: 1000 });
  }).toPass();
  await expect(sidebar.getByRole("button", { name: "light" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(sidebar.getByRole("button", { name: "dark" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.reload();
  await expect(body).toHaveCSS("background-color", LIGHT_BACKGROUND);
  for (const color of await barColors.all())
    await expect(color).toHaveAttribute("content", "#fbfaf7");

  // The home screen: a manifest Chrome can read, and every icon it and the page name.
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await page.request.get(manifestHref ?? "");
  expect(manifest.headers()["content-type"]).toBe("application/manifest+json");
  const { display, icons } = await manifest.json();
  expect(display).toBe("standalone");
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  for (const src of [
    ...icons.map((icon: { src: string }) => icon.src),
    touchIcon,
    "/favicon.ico",
  ]) {
    const icon = await page.request.get(src);
    expect(icon.status(), src).toBe(200);
    expect(icon.headers()["content-type"], src).toMatch(/^image\//);
  }

  // Phone: the sidebar gives way to a top bar whose menu closes when a link is followed.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await menu.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tonight" })).toBeVisible();
  const header = page.getByRole("banner");
  await header.evaluate((node) => node.setAttribute("data-persistence-check", "kept"));
  await page.getByRole("button", { name: "Open menu" }).click();
  await menu.getByRole("link", { name: "Players", exact: true }).click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(menu).toBeHidden();
  await expect(header).toHaveAttribute("data-persistence-check", "kept");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(menu.getByRole("link", { name: "Players", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();

  // The top bar carries the toggle on a phone, so both themes are reachable there too.
  const topBar = page.getByRole("banner");
  // The dev server may have reloaded the page for the new route, so again press until one lands.
  await expect(async () => {
    await topBar.getByRole("button", { name: /^(dark|light) mode$/ }).click();
    await expect(body).toHaveCSS("background-color", DARK_BACKGROUND, { timeout: 1000 });
  }).toPass();
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
