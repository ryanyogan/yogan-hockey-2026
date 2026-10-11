import { expect, test } from "@playwright/test";

const DARK_BACKGROUND = "rgb(15, 23, 42)";
const LIGHT_BACKGROUND = "rgb(251, 250, 247)";

test("the shell renders, switches theme, and a phone gets the tab bar in place of a menu", async ({
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
  const sidebarPlaces = sidebar.getByRole("navigation", { name: "Site" }).getByRole("link");
  await expect(sidebarPlaces).toHaveCount(5);
  for (const [index, name] of ["Home", "Scores", "Standings", "Teams", "Players"].entries())
    await expect(sidebarPlaces.nth(index)).toHaveAccessibleName(name);
  // Today's slate at a glance, from the page's one Scoreboard socket, leading to the scores.
  const tonight = sidebar.getByRole("link", { name: /^Tonight's scores/ });
  await expect(tonight).toHaveAttribute("href", "/nhl/live");
  await expect(tonight).toContainText("to come9");
  // The sidebar's first rule is the score strip's, carried across.
  const ruleUnder = (slot: string) =>
    page.locator(`[data-slot="${slot}"]`).evaluate((node) => node.getBoundingClientRect().bottom);
  expect(await ruleUnder("sidebar-head")).toBeCloseTo(await ruleUnder("score-ticker"), 1);
  await expect(page.getByRole("contentinfo")).toContainText("ESPN");
  await expect(page.locator('[data-slot="score-ticker"]')).toBeAttached();
  const tabBar = page.locator('[data-slot="tab-bar"]');
  await expect(tabBar).toBeHidden();

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

  // Phone: the sidebar gives way to a top bar and, fixed to the foot of the screen, the five
  // places in a tab bar. There is no menu.
  const phone = { width: 390, height: 844 };
  await page.setViewportSize(phone);
  await expect(sidebar).toBeHidden();
  await expect(page.getByRole("button", { name: /menu/i })).toHaveCount(0);
  // The sidebar's navigation is not drawn, so the tab bar is the one a visitor is offered.
  await expect(page.getByRole("navigation", { name: "Site" })).toHaveCount(1);
  const places = tabBar.getByRole("link");
  await expect(places).toHaveText(["Home", "Scores", "Standings", "Teams", "Players"]);
  // A page that is nowhere marks no place.
  await expect(tabBar.locator('[aria-current="page"]')).toHaveCount(0);
  const bar = await tabBar.boundingBox();
  expect(bar && bar.y + bar.height).toBe(phone.height);
  for (const place of await places.all()) {
    const box = await place.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
  // Scrolled to the end, the footer ends above the bar, not under it.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const footer = await page.getByRole("contentinfo").boundingBox();
  expect(footer && footer.y + footer.height).toBeLessThanOrEqual(bar?.y ?? 0);

  const header = page.getByRole("banner");
  await places.getByText("Home", { exact: true }).click();
  await expect(page.getByRole("region", { name: "Tonight" })).toBeVisible();
  await expect(tabBar.locator('[aria-current="page"]')).toHaveText("Home");
  // The bars are the layout's: a place followed changes the page between them and leaves them.
  await header.evaluate((node) => node.setAttribute("data-persistence-check", "kept"));
  await tabBar.evaluate((node) => node.setAttribute("data-persistence-check", "kept"));
  await places.getByText("Players", { exact: true }).click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(tabBar.locator('[aria-current="page"]')).toHaveText("Players");
  await expect(header).toHaveAttribute("data-persistence-check", "kept");
  await expect(tabBar).toHaveAttribute("data-persistence-check", "kept");

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
