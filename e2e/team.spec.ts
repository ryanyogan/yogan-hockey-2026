import type { BrowserContextOptions, Page } from "@playwright/test";
import { expect, shellHydrated, test } from "./test";

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
      // The team's name is the page's headline, under the line that says where it plays.
      await expect(header.getByRole("heading", { level: 1 })).toHaveText("Toronto Maple Leafs");
      await expect(header.locator("[data-slot=team-header] p")).toHaveText(
        /Toronto · Eastern Conference · Atlantic Division/,
      );
      // The one mark on the page is the headline's: no row of a schedule has one.
      await expect(page.locator("main [data-slot=team-mark]")).toHaveCount(1);
      // Toronto has a logo for each theme; the first is the day's.
      await expect(header.locator("h1 [data-slot=team-mark] img").first()).toHaveAttribute(
        "src",
        /^\/team-marks\/21-42\.[0-9a-f]{8}\.webp$/,
      );
      // The place is the standings' own, not ESPN's summary (#209): Toronto is seventh in the
      // recorded Atlantic, level with Buffalo, which has played a game fewer.
      await expect(header.locator("tbody td")).toHaveText([
        "1",
        "2",
        "0",
        "2",
        "7th in Atlantic Division",
      ]);

      // It is the site's own file, loaded, and drawn at the capitals' height: 0.72 of the
      // headline's size, which grows with the window (34 to 40px).
      const mark = header.locator("h1 [data-slot=team-mark] img").first();
      await expect(mark).toHaveJSProperty("complete", true);
      // Never a file smaller than the box it is drawn in.
      expect(
        await mark.evaluate((img: HTMLImageElement) => img.naturalWidth),
      ).toBeGreaterThanOrEqual(42);
      const headline = await header
        .getByRole("heading", { level: 1 })
        .evaluate((h1) => Number.parseFloat(getComputedStyle(h1).fontSize));
      expect(headline).toBeGreaterThanOrEqual(34);
      expect(headline).toBeLessThanOrEqual(40);
      const box = await mark.boundingBox();
      expect(box?.width).toBeCloseTo(headline * 0.72, 1);
      expect(box?.height).toBeCloseTo(headline * 0.72, 1);

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

      const tabOffset = async () => {
        const [tabBox, headerBox] = await Promise.all([
          tabs(page).boundingBox(),
          header.boundingBox(),
        ]);
        if (!tabBox || !headerBox) throw new Error("Team header and tabs must be visible");
        return tabBox.y - headerBox.y;
      };
      const beforeLive = await tabOffset();
      // The game starts: the banner takes the card's place, its row with the pick like any other.
      pushState({
        ...recorded,
        games: recorded.games.map((game) =>
          game.id === GAME_ID ? { ...game, status: "live", period: 1, clock: "20:00" } : game,
        ),
      });
      const playing = rows(page, /^Playing now/);
      await expect(playing.getByRole("link")).toHaveAttribute("href", `/nhl/games/${GAME_ID}`);
      await expect(playing.locator('[data-slot="game-pick"]')).toHaveText("TOR 58%");
      await expect(playing.getByRole("cell").last()).toHaveText(
        "TOR 58%Scotiabank Arena · ESPN+, Scripps Sports",
      );
      await expect(section(page, /^Next game/)).toHaveCount(0);
      // The ticker slate changed from eight to nine games above us; isolate the team content.
      expect(await tabOffset()).toBe(beforeLive);
      pushState({
        ...recorded,
        games: recorded.games.map((game) =>
          game.id === GAME_ID ? { ...game, status: "final" } : game,
        ),
      });
      await expect(section(page, /^Playing now/)).toHaveCount(0);
      await expect(section(page, /^Next game/)).toHaveCount(0);
      expect(await tabOffset()).toBe(beforeLive);
      pushState(recorded);
      await expect(section(page, /^Next game/)).toHaveCount(1);
      expect(await tabOffset()).toBe(beforeLive);
    },
    { timezoneId: "America/Los_Angeles" },
    standBetween,
  );

  await paste("/nhl/teams/21/roster", async (page) => {
    await expect(page).toHaveTitle(TITLE);
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("roster");
    // Every player comes from ESPN's roster.
    await expect(section(page, /^Roster/).getByRole("heading")).toHaveText(/24 players/);
    await expect(rows(page, /^Roster/)).toHaveCount(24);
    // Jersey order, each player linking to his page.
    await expect(
      rows(page, /^Roster/)
        .first()
        .getByRole("cell"),
      // The last cell is his heart (#45), which has a name and no text.
    ).toHaveText(["3", "Nick Blankenburg", "D", ""]);
    await expect(page.getByRole("link", { name: "Auston Matthews" })).toHaveAttribute(
      "href",
      "/players/4024123",
    );
    await expect(back(page)).toHaveAttribute("href", "/nhl");
  });

  await paste("/nhl/teams/21/stats", async (page) => {
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

    // An address under a team that no route answers is the site's own not-found page, alone.
    const lost = await page.request.get("/nhl/teams/21/coaches");
    expect(lost.status()).toBe(404);
    const lostPage = await lost.text();
    expect(lostPage).toContain("<title>Not found · Yogan Hockey</title>");
    expect(lostPage).toContain("Nothing is kept at this address.");
    expect(lostPage).not.toContain('data-slot="team-header"');

    // The title is in <head> for whoever reads the HTML alone, as a link preview does.
    const response = await page.request.get("/nhl/teams/21/stats", {
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

test("a team opens from a link the pointer rested on with no further request, and a tab asks for itself alone", async ({
  browser,
}) => {
  // The router preloads nothing for a crawler, and headless Chromium says it is one.
  const probe = await browser.newContext();
  const userAgent = (await (await probe.newPage()).evaluate(() => navigator.userAgent)).replace(
    "HeadlessChrome",
    "Chrome",
  );
  await probe.close();
  const context = await browser.newContext({ userAgent });
  const page = await context.newPage();

  // What a loader asks the server for is its server function, and a whole page is a document.
  let reads: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/_serverFn/")) reads.push(pathname);
    else if (request.resourceType() === "document") reads.push(`document ${pathname}`);
  });

  await page.goto("/nhl?tab=teams");
  const link = page.getByRole("main").locator('a[href="/nhl/teams/21"]');
  // Being on screen preloads nothing: thirty-two rows are not thirty-two reads.
  await expect(link).toBeVisible();
  await shellHydrated(page);
  expect(reads).toEqual(["document /nhl"]);
  reads = [];
  // The pointer rests on the row and the page is read, once: the team and its schedule.
  await link.hover();
  await expect.poll(() => reads.length).toBe(2);
  // Let the reads finish; the click then has nothing to ask the server.
  await page.waitForLoadState("networkidle");
  const preloaded = reads;
  expect(new Set(preloaded).size).toBe(2);
  reads = [];

  await link.click();
  await expect(page).toHaveURL(/\/nhl\/teams\/21$/);
  await expect(page).toHaveTitle(TITLE);
  await expect(rows(page, /^Upcoming/)).toHaveCount(81);
  expect(reads).toEqual([]);

  // A tab is a route under the team's: the header stays, the address changes, and the one thing
  // asked of the server is the tab's own read, never the team's again.
  const header = section(page, /^Toronto Maple Leafs/);
  await header.evaluate((node) => node.setAttribute("data-kept", ""));
  for (const tab of ["roster", "stats"]) {
    await tabs(page).getByRole("link", { name: tab }).click();
    await expect(page).toHaveURL(new RegExp(`/nhl/teams/21/${tab}$`));
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText(tab);
    await page.waitForLoadState("networkidle");
    expect(reads).toHaveLength(1);
    expect(preloaded).not.toContain(reads[0]);
    reads = [];
  }
  await expect(rows(page, /^Season stats/)).toHaveCount(1);
  // The header is the element it was: it was not drawn again.
  await expect(header).toHaveAttribute("data-kept", "");
  // Back to a tab already read costs nothing.
  await tabs(page).getByRole("link", { name: "schedule" }).click();
  await expect(rows(page, /^Upcoming/)).toHaveCount(81);
  expect(reads).toEqual([]);

  // The addresses the tabs had in the query string lead to the new ones, for good.
  for (const tab of ["roster", "stats"]) {
    const old = await page.request.get(`/nhl/teams/21?tab=${tab}`, { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers().location).toContain(`/nhl/teams/21/${tab}`);
  }
  await context.close();
});
