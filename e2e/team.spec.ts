import { type BrowserContextOptions, expect, type Page, test } from "@playwright/test";

const TITLE = "Toronto Maple Leafs · Yogan Hockey";

const tabs = (page: Page) => page.getByRole("navigation", { name: "Team" });
const section = (page: Page, title: RegExp) =>
  page.locator("main section").filter({ has: page.getByRole("heading", { name: title }) });
const rows = (page: Page, title: RegExp) => section(page, title).locator("tbody tr");
// The foot of the page, on every tab: the way back to the league.
const back = (page: Page) => page.getByRole("main").getByRole("link", { name: "back to NHL" });

// Nashville at Toronto, Toronto's next game and on the recorded slate.
const GAME_ID = "401892449";
type Slate = { games: { id: string; [field: string]: unknown }[]; [field: string]: unknown };

test("a team's page shows each tab from a pasted URL, titled with the team's name", async ({
  browser,
}) => {
  // Each address is opened in a browser of its own, as a pasted link is, which also keeps to one
  // hard navigation per page (see the build notes).
  const paste = async (
    url: string,
    check: (page: Page) => Promise<void>,
    options: BrowserContextOptions = {},
    before: (page: Page) => Promise<void> = async () => {},
  ) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await before(page);
    await page.goto(url);
    await check(page);
    await context.close();
  };

  // The recorded slate never changes, so the test stands between the first page and the
  // Scoreboard, as `live.spec.ts` does, and later sends a slate of its own.
  let slate: Slate | undefined;
  let pushState: (state: Slate) => void = () => {};
  const standBetween = (page: Page) =>
    page.routeWebSocket(/\/agents\/scoreboard-agent\/main/, (socket) => {
      const agent = socket.connectToServer();
      agent.onMessage((message) => {
        const parsed = JSON.parse(String(message));
        if (parsed.type === "cf_agent_state") slate = parsed.state;
        socket.send(message);
      });
      pushState = (state) => socket.send(JSON.stringify({ type: "cf_agent_state", state }));
    });

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
      await expect(next.getByRole("link")).toHaveAttribute("href", `/nhl/games/${GAME_ID}`);
      await expect(next).toContainText("4:00 PM");
      // The game is on today's slate: its pick as the dashboard's row has it, then where.
      await expect(next.getByRole("cell").last()).toHaveText("TOR 58%Scotiabank Arena");
      // Nobody is playing in the recorded slate, so there is no banner.
      await expect(section(page, /^Playing now/)).toHaveCount(0);
      await expect(back(page)).toHaveAttribute("href", "/nhl");

      await expect(rows(page, /^Upcoming/)).toHaveCount(81);
      await expect(rows(page, /^Upcoming/).first()).toHaveText(/Tue Oct 6.*Nashville.*4:00 PM/);
      // Results, newest first, each linking to its Replay.
      await expect(rows(page, /^Results/)).toHaveCount(3);
      const latest = rows(page, /^Results/).first();
      await expect(latest).toHaveText(/Sat Oct 3.*Ottawa Senators.*L.*2-3/);
      await expect(latest.getByRole("link")).toHaveAttribute("href", "/nhl/games/401892434");

      // The Scoreboard's slate without the game: the card stays as it was, without a pick.
      await expect.poll(() => slate, { message: "the socket delivered the slate" }).toBeDefined();
      const recorded = slate as Slate;
      pushState({ ...recorded, games: recorded.games.filter((game) => game.id !== GAME_ID) });
      await expect(next.getByRole("cell").last()).toHaveText("Scotiabank Arena");

      // The game starts: the banner takes the card's place, its row with the pick like any other.
      pushState({
        ...recorded,
        games: recorded.games.map((game) =>
          game.id === GAME_ID ? { ...game, status: "live", period: 1, clock: "20:00" } : game,
        ),
      });
      const playing = rows(page, /^Playing now/);
      await expect(playing.getByRole("link")).toHaveAttribute("href", `/nhl/games/${GAME_ID}`);
      await expect(playing.getByRole("cell").last()).toHaveText(
        "TOR 58%Scotiabank Arena · ESPN+, Scripps Sports",
      );
      await expect(section(page, /^Next game/)).toHaveCount(0);
    },
    { timezoneId: "America/Los_Angeles" },
    standBetween,
  );

  await paste("/nhl/teams/21?tab=roster", async (page) => {
    await expect(page).toHaveTitle(TITLE);
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("roster");
    // ESPN's 24 and, ahead of them, the fictional player of #46 (`e2e/family.spec.ts`).
    await expect(section(page, /^Roster/).getByRole("heading")).toHaveText(/25 players/);
    await expect(rows(page, /^Roster/)).toHaveCount(25);
    // After him in jersey order, each player linking to his page.
    await expect(
      rows(page, /^Roster/)
        .nth(1)
        .getByRole("cell"),
      // The last cell is his heart (#45), which has a name and no text.
    ).toHaveText(["3", "Nick Blankenburg", "D", ""]);
    await expect(page.getByRole("link", { name: "Auston Matthews" })).toHaveAttribute(
      "href",
      "/players/4024123",
    );
    await expect(back(page)).toHaveAttribute("href", "/nhl");
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
    await expect(back(page)).toHaveAttribute("href", "/nhl");
  });

  // An id that is no team's: "team not found", with the way back to the teams.
  await paste("/nhl/teams/leafs", async (page) => {
    await expect(page).toHaveTitle("Team not found · Yogan Hockey");
    await expect(page.getByRole("heading", { name: /^Team not found/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "All teams" })).toHaveAttribute(
      "href",
      "/nhl?tab=teams",
    );

    // Unverified row 10 of the spec. A browser is sent the title late, in the body, and shows
    // it; a link preview reads the HTML alone, and for those the title is in <head>.
    const response = await page.request.get("/nhl/teams/21?tab=stats", {
      headers: { "user-agent": "Twitterbot/1.0" },
    });
    const head = (await response.text()).split("</head>")[0];
    expect(head).toContain(`<title>${TITLE}</title>`);
  });
});

// Every team but Toronto has no recording, and a missing recording fails as ESPN failing does.
test("a team that cannot be read says so inside the shell, with a retry and a way back", async ({
  page,
}) => {
  const response = await page.goto("/nhl/teams/1");
  expect(response?.status()).toBe(503);
  await expect(page).toHaveTitle("Not answering · Yogan Hockey");
  await expect(page.getByRole("navigation", { name: "Site" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const main = page.getByRole("main");
  await expect(main).toContainText(
    "ESPN is not answering just now, so this team could not be read",
  );
  await expect(main.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(main.getByRole("link", { name: "all teams" })).toHaveAttribute(
    "href",
    "/nhl?tab=teams",
  );
  // What failed is not the visitor's to read.
  await expect(main).not.toContainText("fixture");
});
