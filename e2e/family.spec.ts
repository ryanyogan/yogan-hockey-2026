import { expect, type Page, test } from "@playwright/test";

const tabs = (page: Page) => page.getByRole("navigation", { name: "Rylan Yogan" });
const section = (page: Page, title: RegExp) =>
  page.locator("main section").filter({ has: page.getByRole("heading", { name: title }) });

test("/family/rylan shows each tab from a pasted URL, and /yogan leads to it", async ({
  browser,
}) => {
  // Each address is opened in a browser of its own, as a pasted link is (see the build notes).
  const paste = async (url: string, check: (page: Page) => Promise<void>) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);
    await check(page);
    await context.close();
  };

  await paste("/family/rylan", async (page) => {
    await expect(page).toHaveTitle("Rylan Yogan · Yogan Hockey");
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("stats");

    const header = page.locator('[data-slot="player-header"]');
    await expect(header.getByRole("heading", { name: /Rylan Yogan/ })).toContainText(
      "Center · #99 · Chicago Falcons",
    );
    await expect(page.getByText("stats may be slightly exaggerated")).toBeVisible();

    await expect(section(page, /^Season/).getByRole("heading")).toContainText("2026-27");
    await expect(section(page, /^Career/).getByRole("heading")).toContainText("4 seasons");
    await expect(section(page, /^Career/).locator("tbody tr")).toHaveCount(5);
    // The club is its name and nothing else.
    await expect(section(page, /^Team/).locator("tbody tr")).toHaveText("Chicago Falcons");
    await expect(page.getByRole("link", { name: "career projection" })).toHaveAttribute(
      "href",
      "/players/rylan-yogan",
    );
    await expect(tabs(page).getByRole("link", { name: "schedule" })).toHaveAttribute(
      "href",
      "/family/rylan?tab=schedule",
    );
  });

  await paste("/family/rylan?tab=schedule", async (page) => {
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("schedule");
    await expect(section(page, /^Upcoming/).locator("tbody tr")).toHaveCount(4);
    await expect(section(page, /^Games/).locator("tbody tr")).toHaveCount(6);
    await expect(
      section(page, /^Games/)
        .locator("tbody tr")
        .first(),
    ).toContainText("vs Loch Ness Monsters");
    await expect(section(page, /^Team/).locator("tbody tr")).toHaveText("Chicago Falcons");
  });

  await paste("/yogan", async (page) => {
    await expect(page).toHaveURL(/\/family\/rylan$/);
    await expect(page.getByRole("heading", { name: /Rylan Yogan/ })).toBeVisible();
  });
});

test("the fictional Rylan Yogan leads Toronto's roster, is found by search and has a page", async ({
  page,
}) => {
  await page.goto("/nhl/teams/21?tab=roster");

  // Toronto as recorded has 24 players; he is the 25th, and the first row.
  const roster = section(page, /^Roster/);
  await expect(roster.getByRole("heading")).toContainText("25 players");
  await expect(roster.locator("tbody tr")).toHaveCount(25);
  const first = roster.locator("tbody tr").first();
  await expect(first).toContainText("99");
  await expect(first).toContainText("Rylan Yogan");
  await expect(first.getByRole("link")).toHaveAttribute("href", "/players/rylan-yogan");

  // Fixture mode has no recording of this search: he is found without ESPN.
  await expect(async () => {
    await page.getByRole("complementary").getByRole("link", { name: "players" }).click();
    await expect(page).toHaveURL(/\/players$/, { timeout: 2000 });
  }).toPass();
  const box = page.getByRole("searchbox", { name: "player name" });
  const results = page.getByRole("table").getByRole("link");
  await expect(async () => {
    await box.fill("");
    await box.pressSequentially("yog");
    await expect(results).toHaveCount(1, { timeout: 2000 });
  }).toPass();
  const found = page.getByRole("row").filter({ hasText: "Rylan Yogan" });
  await expect(found).toContainText("C");
  await expect(found).toContainText("TOR");

  await found.getByRole("link").click();
  await expect(page).toHaveURL(/\/players\/rylan-yogan$/);
  await expect(page).toHaveTitle("Rylan Yogan · Yogan Hockey");
  const header = page.locator('[data-slot="player-header"]');
  await expect(header.getByRole("heading", { name: /Rylan Yogan/ })).toContainText("Center · #99");
  await expect(
    section(page, /^Season/)
      .locator("tbody tr")
      .first(),
  ).toContainText("147");
  await expect(section(page, /^Career/).getByRole("heading")).toContainText("11 seasons");
  await expect(page.getByRole("row").filter({ hasText: "career" })).toContainText("2,299");
});
