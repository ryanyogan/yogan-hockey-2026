import { expect, type Page, test } from "@playwright/test";

const tabs = (page: Page) => page.getByRole("navigation", { name: "NHL", exact: true });
const views = (page: Page) => page.getByRole("navigation", { name: "Standings view" });
const rows = (page: Page) => page.getByRole("table").getByRole("row");
// The Teams tab is a list, not a table: one item a team.
const teams = (page: Page) => page.getByRole("main").getByRole("listitem");

// The recorded standings (fixture mode): the table titles each view draws, in order.
const VIEWS = [
  {
    // The default view has the bare address.
    url: "/nhl",
    view: "division",
    tables: ["Atlantic Division", "Metropolitan Division", "Central Division", "Pacific Division"],
  },
  {
    url: "/nhl?view=conference",
    view: "conference",
    tables: ["Eastern Conference", "Western Conference"],
  },
  {
    url: "/nhl?view=wildcard",
    view: "wild card",
    tables: [
      "Atlantic Division",
      "Metropolitan Division",
      "Wild Card",
      "Central Division",
      "Pacific Division",
      "Wild Card",
    ],
    also: async (page: Page) => {
      // The playoff line, under each conference's second wild card.
      await expect(page.locator("tr[data-cutoff]")).toHaveCount(2);
    },
  },
  {
    url: "/nhl?view=league",
    view: "league",
    tables: ["National Hockey League"],
    also: async (page: Page) => {
      // All 32 teams under one header, ranked, each row linking to its team.
      await expect(rows(page)).toHaveCount(33);
      const leader = rows(page).nth(1);
      await expect(leader.getByRole("cell")).toHaveText([
        "1",
        // A team is its agate name, at every width.
        "N.Y. Rangers",
        "4",
        "3",
        "1",
        "0",
        "+5",
        "6",
      ]);
      await expect(leader.getByRole("link")).toHaveAttribute("href", "/nhl/teams/13");
      // No row has a team's mark (agate.md, Decisions): the score strip above has them, and
      // the team's own page (`team.spec.ts`).
      await expect(page.locator("main [data-slot=team-mark]")).toHaveCount(0);
    },
  },
];

test("/nhl shows each standings view and the teams from a pasted URL, and reads again when the Scoreboard reports a final", async ({
  browser,
  page,
}) => {
  // The page's own Scoreboard socket, with a way to say on it what the Agent would.
  let say: (message: unknown) => void = () => {};
  let state: Record<string, unknown> | null = null;
  await page.routeWebSocket(/\/agents\/scoreboard-agent\/main/, (socket) => {
    const agent = socket.connectToServer();
    socket.onMessage((message) => agent.send(message));
    agent.onMessage((message) => {
      try {
        const parsed = JSON.parse(String(message));
        if (parsed.type === "cf_agent_state") state = parsed.state;
      } catch {
        // Not JSON: the Agents SDK's own business.
      }
      socket.send(message);
    });
    say = (message) => socket.send(JSON.stringify(message));
  });
  // What a loader asks the server for: its server function.
  const reads: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/_serverFn/")) reads.push(request.url());
  });
  await page.goto("/nhl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Standings by division");
  // Today's games came with the page, and the socket has spoken: neither made a loader run.
  await expect.poll(() => state).not.toBeNull();
  await page.waitForFunction(
    () => (window as { __APP_HYDRATED?: boolean }).__APP_HYDRATED === true,
  );
  expect(reads).toEqual([]);
  // The state again changes nothing: its `invalidatedAt` is the one the page was drawn with.
  say({ type: "cf_agent_state", state });
  // A final: cached data was forgotten later than this page was read.
  say({
    type: "cf_agent_state",
    state: { ...(state ?? {}), invalidatedAt: "2099-01-01T00:00:00.000Z" },
  });
  // The root's read and `/nhl`'s, once each, and the page is whole all the while.
  await expect.poll(() => reads.length).toBe(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Standings by division");
  await page.waitForTimeout(500);
  expect(reads).toHaveLength(2);

  // Each address is opened in a browser of its own, as a pasted link is, which also keeps to one
  // hard navigation per page (see the build notes).
  const paste = async (url: string, check: (page: Page) => Promise<void>) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // No image is ESPN's: the marks are the site's own files.
    const abroad: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname !== "localhost") abroad.push(request.url());
    });
    await page.goto(url);
    await check(page);
    expect(abroad).toEqual([]);
    await context.close();
  };

  for (const { url, view, tables, also } of VIEWS) {
    await paste(url, async (page) => {
      await expect(page).toHaveTitle("NHL standings · Yogan Hockey");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Standings by ${view}`);
      await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("standings");
      await expect(views(page).locator('[aria-current="page"]')).toHaveText(view);
      await expect(page.locator("main section h2")).toHaveText(
        tables.map((title) => new RegExp(`^${title}`)),
      );
      await also?.(page);
    });
  }

  await paste("/nhl?tab=teams", async (page) => {
    await expect(page).toHaveTitle("NHL teams · Yogan Hockey");
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("teams");
    await expect(views(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teams");
    await expect(teams(page)).toHaveCount(32);
    await expect(page.locator("main [data-slot=team-mark]")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Toronto Maple Leafs" })).toHaveAttribute(
      "href",
      "/nhl/teams/21",
    );
  });
});
