import { expect, shellHydrated, test } from "./test";

const DARK_BACKGROUND = "rgb(27, 27, 25)";
const LIGHT_BACKGROUND = "rgb(250, 250, 248)";
const SECTIONS = ["Home", "Scores", "Standings", "Teams", "Players", "Picks"];

test("the masthead is the dateline strip, the wordmark and the sections at any width, and switches theme", async ({
  page,
}) => {
  // The operating system asks for dark, and the visitor has not chosen yet.
  await page.emulateMedia({ colorScheme: "dark" });
  // An unknown path gets the not-found page inside the shell, so the shell is checked there.
  // (One hard navigation only: on a cold dev server a second one, made while the first page's
  // modules are still loading, crashes the page.)
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  // The document a search engine is sent asks not to be indexed, in one tag (#215).
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");

  // Desktop: the wordmark leads home.
  const masthead = page.getByRole("banner");
  const wordmark = masthead.getByRole("link", { name: "Yogan Hockey" });
  await expect(wordmark).toHaveAttribute("href", "/");
  // The sections are written once, in a row of their own under the wordmark.
  const sections = page.getByRole("navigation", { name: "Site" });
  await expect(page.locator('nav[aria-label="Site"]')).toHaveCount(1);
  await expect(sections).toBeVisible();
  await expect(sections.getByRole("link")).toHaveText(SECTIONS);
  const sectionNav = page.locator('[data-slot="section-nav"]');
  const dateline = page.locator('[data-slot="dateline"]');
  const strip = page.locator('[data-slot="dateline-strip"]');
  const inOrder = async () => {
    const [top, name, line, row] = await Promise.all(
      [strip, wordmark, dateline, sectionNav].map((part) => part.boundingBox()),
    );
    // With the page at its top, the strip is the first thing on it; then the wordmark, tonight's
    // line and the sections, each under the one before.
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(top?.y).toBe(0);
    expect(name?.y).toBeGreaterThanOrEqual((top?.y ?? 0) + (top?.height ?? 0));
    expect(line?.y).toBeGreaterThanOrEqual((name?.y ?? 0) + (name?.height ?? 0));
    expect(row?.y).toBeGreaterThanOrEqual((line?.y ?? 0) + (line?.height ?? 0));
  };
  await inOrder();
  // The strip opens with the date, whole at a desk.
  await expect(strip.locator('[data-slot="masthead-date"]')).toHaveText("Tuesday, October 6, 2026");
  // Today's slate at a glance, from the page's one Scoreboard socket, on the dateline.
  await expect(dateline).toContainText("Tonight: 9 games · 9 to come");
  await expect(page.getByRole("contentinfo")).toContainText("ESPN");
  // Any page but Home has the score strip under the dateline.
  const scores = page.locator('[data-slot="score-ticker"]');
  await expect(scores.getByRole("navigation", { name: "Scores" })).toBeVisible();
  // There is no sidebar and no tab bar.
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await expect(page.locator('[data-slot="tab-bar"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
    "href",
    "#content",
  );
  await expect(page.getByRole("main")).toHaveAttribute("id", "content");

  // The theme follows the operating system until the visitor chooses, then keeps the choice.
  const body = page.locator("body");
  await expect(body).toHaveCSS("background-color", DARK_BACKGROUND);
  // The browser's own bars take the colour of the page shown: the operating system's theme
  // until the visitor chooses, then the choice, though the operating system still asks for dark.
  const barColors = page.locator('meta[name="theme-color"]');
  await expect(barColors).toHaveCount(2);
  await expect(page.locator('meta[name="theme-color"][media*="dark"]')).toHaveAttribute(
    "content",
    "#1b1b19",
  );
  // The control is written once, at the end of the strip.
  const theme = page.getByRole("group", { name: "Theme" });
  await expect(theme).toHaveCount(1);
  await expect(strip.getByRole("group", { name: "Theme" })).toBeVisible();
  // A press before the page has hydrated does nothing, so press until one lands.
  await expect(async () => {
    await theme.getByRole("button", { name: "Day" }).click();
    await expect(body).toHaveCSS("background-color", LIGHT_BACKGROUND, { timeout: 1000 });
  }).toPass();
  await expect(theme.getByRole("button", { name: "Day" })).toHaveAttribute("aria-pressed", "true");
  await expect(theme.getByRole("button", { name: "Night" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.reload();
  await expect(body).toHaveCSS("background-color", LIGHT_BACKGROUND);
  for (const color of await barColors.all())
    await expect(color).toHaveAttribute("content", "#fafaf8");

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

  // Phone: the same order, the strip's date without its year. There is no menu.
  const phone = { width: 390, height: 844 };
  await page.setViewportSize(phone);
  await expect(page.getByRole("button", { name: /menu/i })).toHaveCount(0);
  await expect(strip.locator('[data-slot="masthead-date"] > :visible')).toHaveCount(0);
  await expect(strip).toContainText("Tuesday, October 6");
  await inOrder();
  const places = sectionNav.getByRole("link");
  await expect(places).toHaveText(SECTIONS);
  // A page that is nowhere marks no place.
  await expect(sectionNav.locator('[aria-current="page"]')).toHaveCount(0);
  for (const place of await places.all()) {
    const box = await place.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
  // Tonight's line is one line, and nothing scrolls sideways.
  await expect(dateline.locator("span:visible")).toHaveText(/^9 games( · Picks \d+–\d+)?$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(phone.width);

  // A phone has the same two buttons, each a thumb's reach: the theme shown is the one pressed.
  await expect(theme).toHaveCount(1);
  await expect(theme.getByRole("button")).toHaveText(["Day", "Night"]);
  await expect(async () => {
    await theme.getByRole("button", { name: "Night" }).click();
    await expect(body).toHaveCSS("background-color", DARK_BACKGROUND, { timeout: 1000 });
  }).toPass();
  await expect(theme.getByRole("button", { name: "Night" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
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

// This was the middle of the test above, and goes back there at the cutover if one hard
// navigation a spec still matters.
test("a section followed changes the page under the masthead and leaves it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/no-such-page");
  // A section pressed before the shell has hydrated is a new document, masthead and all, and the
  // mark made on the old one is gone with it. The not-found page is the shell's own, so there is
  // no page under the masthead still to hydrate.
  await shellHydrated(page);
  const masthead = page.getByRole("banner");
  const strip = page.locator('[data-slot="score-ticker"]');
  const sectionNav = page.locator('[data-slot="section-nav"]');
  const places = sectionNav.getByRole("link");
  const stuck = async () => {
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(async () => (await sectionNav.boundingBox())?.y).toBe(0);
  };

  await places.getByText("Home", { exact: true }).click();
  await expect(page.getByRole("region", { name: "NHL Roundup" })).toBeVisible();
  await expect(sectionNav.locator('[aria-current="page"]')).toHaveText("Home");
  // The current section is in the one red, and no section has a rule or a fill of its own.
  const KICKER = "rgb(200, 16, 46)";
  await expect(places.getByText("Home", { exact: true })).toHaveCSS("color", KICKER);
  await expect(places.getByText("Home", { exact: true })).toHaveCSS("border-bottom-width", "0px");
  // Home's page is the scores: it has no strip.
  await expect(strip).toHaveCount(0);
  // Scrolled to the end, the bar is still at the top of the screen.
  await stuck();
  // The masthead is the root route's: a section followed changes the page under it and leaves it.
  await masthead.evaluate((node) => node.setAttribute("data-persistence-check", "kept"));
  await sectionNav.evaluate((node) => node.setAttribute("data-persistence-check", "kept"));
  await places.getByText("Players", { exact: true }).click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(sectionNav.locator('[aria-current="page"]')).toHaveText("Players");
  await expect(masthead).toHaveAttribute("data-persistence-check", "kept");
  await expect(sectionNav).toHaveAttribute("data-persistence-check", "kept");
  await expect(strip).toBeAttached();
  // At a desk too the sections stay at the top of the screen.
  // (A short window: the players' page with nothing searched for is not a tall one.)
  await page.setViewportSize({ width: 1440, height: 320 });
  await stuck();
});
