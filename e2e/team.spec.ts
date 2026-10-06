import { type BrowserContextOptions, expect, type Page, test } from "@playwright/test";

const TITLE = "Toronto Maple Leafs · Yogan Hockey";

const tabs = (page: Page) => page.getByRole("navigation", { name: "Team" });
const section = (page: Page, title: RegExp) =>
  page.locator("main section").filter({ has: page.getByRole("heading", { name: title }) });
const rows = (page: Page, title: RegExp) => section(page, title).locator("tbody tr");

test("a team's page shows each tab from a pasted URL, titled with the team's name", async ({
  browser,
}) => {
  // Each address is opened in a browser of its own, as a pasted link is, which also keeps to one
  // hard navigation per page (see the build notes).
  const paste = async (
    url: string,
    check: (page: Page) => Promise<void>,
    options: BrowserContextOptions = {},
  ) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto(url);
    await check(page);
    await context.close();
  };

  // Toronto as recorded (fixture mode): three games played, 81 to play, Nashville next.
  await paste(
    "/nhl/teams/21",
    async (page) => {
      await expect(page).toHaveTitle(TITLE);
      await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("schedule");

      const header = section(page, /^Toronto Maple Leafs/);
      await expect(header.getByRole("heading")).toHaveText(
        /Toronto · Eastern Conference · Atlantic Division/,
      );
      await expect(header.locator("tbody td")).toHaveText([
        "1",
        "2",
        "0",
        "2",
        "6th in Atlantic Division",
      ]);

      // The Next Game card links to the scheduled game's page, at the visitor's own time.
      const next = rows(page, /^Next game/);
      await expect(next.getByRole("link")).toHaveAttribute("href", "/nhl/games/401892449");
      await expect(next).toContainText("4:00 PM");
      // Nobody is playing in the recorded slate, so there is no banner.
      await expect(section(page, /^Playing now/)).toHaveCount(0);

      await expect(rows(page, /^Upcoming/)).toHaveCount(81);
      await expect(rows(page, /^Upcoming/).first()).toHaveText(/Tue Oct 6.*Nashville.*4:00 PM/);
      // Results, newest first, each linking to its Replay.
      await expect(rows(page, /^Results/)).toHaveCount(3);
      const latest = rows(page, /^Results/).first();
      await expect(latest).toHaveText(/Sat Oct 3.*Ottawa Senators.*L.*2-3/);
      await expect(latest.getByRole("link")).toHaveAttribute("href", "/nhl/games/401892434");
    },
    { timezoneId: "America/Los_Angeles" },
  );

  await paste("/nhl/teams/21?tab=roster", async (page) => {
    await expect(page).toHaveTitle(TITLE);
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("roster");
    await expect(section(page, /^Roster/).getByRole("heading")).toHaveText(/24 players/);
    await expect(rows(page, /^Roster/)).toHaveCount(24);
    // In jersey order, each player linking to his page.
    await expect(
      rows(page, /^Roster/)
        .first()
        .getByRole("cell"),
    ).toHaveText(["3", "Nick Blankenburg", "D"]);
    await expect(page.getByRole("link", { name: "Auston Matthews" })).toHaveAttribute(
      "href",
      "/players/4024123",
    );
  });

  await paste("/nhl/teams/21?tab=stats", async (page) => {
    await expect(page).toHaveTitle(TITLE);
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("stats");
    // Played, goals for, goals against, difference, power play, penalty kill, home, road.
    await expect(rows(page, /^Season stats/).getByRole("cell")).toHaveText([
      "3",
      "6",
      "7",
      "-1",
      "18.2",
      "100.0",
      "1-2-0",
      "0-0-0",
      "",
    ]);
  });

  // An id that is no team's: "team not found", with the way back to the teams.
  await paste("/nhl/teams/leafs", async (page) => {
    await expect(page.getByRole("heading", { name: /^Team not found/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "All teams" })).toHaveAttribute(
      "href",
      "/nhl?tab=teams",
    );
  });
});

// Unverified row 10 of the spec. A browser is sent the title late, in the body, and shows it; a
// link preview reads the HTML alone, and for those the title is in <head>.
test("the team's name is in the <head> a link preview reads", async ({ request }) => {
  const response = await request.get("/nhl/teams/21?tab=stats", {
    headers: { "user-agent": "Twitterbot/1.0" },
  });
  const head = (await response.text()).split("</head>")[0];
  expect(head).toContain(`<title>${TITLE}</title>`);
});
