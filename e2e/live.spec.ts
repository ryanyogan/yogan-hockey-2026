import { expect, test } from "@playwright/test";

// Nashville at Toronto, on the recorded slate of nine games still to be played.
const GAME_ID = "401892449";

// A visitor in Chicago, an hour behind the NHL's Eastern time: every time is shown in his own.
test.use({ timezoneId: "America/Chicago" });

type Side = Record<string, unknown>;
type Slate = {
  games: { id: string; away: Side; home: Side; [field: string]: unknown }[];
  [field: string]: unknown;
};

test("/nhl/live lists the slate in sections, links each game, and follows the socket", async ({
  page,
}) => {
  // The recorded slate never changes, so the test stands between the page and the Scoreboard: it
  // passes on what the Agent sends, keeps a copy, and later sends a state of its own as the Agent.
  let slate: Slate | undefined;
  let pushState: (state: Slate) => void = () => {};
  let sayHeardAt: (at: string) => void = () => {};
  await page.routeWebSocket(/\/agents\/scoreboard-agent\/main/, (socket) => {
    const agent = socket.connectToServer();
    agent.onMessage((message) => {
      const parsed = JSON.parse(String(message));
      if (parsed.type === "cf_agent_state") slate = parsed.state;
      socket.send(message);
    });
    pushState = (state) => socket.send(JSON.stringify({ type: "cf_agent_state", state }));
    sayHeardAt = (at) => socket.send(JSON.stringify({ type: "scoreboard_heard", at }));
  });
  // Every time the page asks the server to render it again.
  let rerenders = 0;
  page.on("request", (request) => {
    const again = request.headers().rsc === "1" && new URL(request.url()).pathname === "/nhl/live";
    if (again) rerenders += 1;
  });

  await page.goto("/nhl/live");
  await expect(page).toHaveTitle(/Live Scores/);
  await expect(page.getByRole("heading", { name: /Live scores/ })).toContainText("9 games");
  await expect(page.getByText(/updated \d\d:\d\d:\d\d$/)).toBeVisible();

  // First paint, from the server: every game is still to come, so the other sections are absent.
  const upcoming = page.getByRole("region", { name: "Upcoming" });
  const inProgress = page.getByRole("region", { name: "In progress" });
  await expect(upcoming.getByRole("row")).toHaveCount(10);
  await expect(inProgress).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Final" })).toHaveCount(0);
  await expect(upcoming.getByRole("link", { name: /NSH at TOR, 6:00 PM$/ })).toHaveAttribute(
    "href",
    `/nhl/games/${GAME_ID}`,
  );
  // Each team with its record, then where the game is played and who shows it.
  const row = upcoming.getByRole("row").filter({ hasText: "NSH" });
  await expect(row.getByRole("cell").nth(1)).toHaveText("NSH1-1-0");
  await expect(row.getByRole("cell").nth(2)).toHaveText("TOR1-2-0");
  await expect(row.locator('[data-slot="game-pick"]')).toHaveText("TOR 58%");
  await expect(row.getByRole("cell").last()).toHaveText("Scotiabank Arena · ESPN+, Scripps Sports");

  // The ticker, on this page as on every other: a way to the scores, then one entry per game.
  const ticker = page.getByRole("navigation", { name: "Scores" });
  await expect(ticker.getByRole("link")).toHaveCount(9);
  const entry = ticker.locator(`a[href="/nhl/games/${GAME_ID}"]`);
  await expect(entry).toHaveText(/NSH.*TOR.*6:00 PM$/);
  // Every score fits without a carousel or sideways page scrolling, also on narrow phones.
  const desktop = page.viewportSize();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const list = ticker.getByRole("list", { name: "All of today's games" });
    await expect(list.getByRole("link")).toHaveCount(9);
    for (const link of await list.getByRole("link").all())
      await expect(link).toBeInViewport({ ratio: 1 });
    expect(await list.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
    await expect(row.locator('[data-slot="game-pick"]')).toBeVisible();
  }
  if (desktop != null) await page.setViewportSize(desktop);

  // The Scoreboard pushes a change: the game is on, and the page follows without a refresh.
  await expect.poll(() => slate, { message: "the socket delivered the slate" }).toBeDefined();
  const games = (slate as Slate).games.map((game) =>
    game.id === GAME_ID
      ? {
          ...game,
          status: "live",
          period: 2,
          clock: "12:34",
          away: { ...game.away, score: 2 },
          home: { ...game.home, score: 1 },
        }
      : game,
  );
  pushState({ ...(slate as Slate), games });

  await expect(inProgress.getByRole("row")).toHaveCount(2);
  await expect(inProgress.getByRole("link", { name: /NSH at TOR, live, 2nd 12:34/ })).toBeVisible();
  await expect(upcoming.getByRole("row")).toHaveCount(9);
  await expect(entry).toHaveText(/NSH 2.*TOR 1.*2nd 12:34/);
  await expect(entry).toHaveAttribute("data-live", "");
  await expect(ticker.getByRole("link").first()).toHaveAttribute("href", `/nhl/games/${GAME_ID}`);

  // A poll that finds nothing new sends only its time, and "updated" follows it.
  sayHeardAt("2031-01-16T01:02:03.000Z");
  await expect(page.getByText("updated 19:02:03")).toBeVisible();

  // The game ends: it moves to Final.
  const over = {
    ...(slate as Slate),
    games: games.map((game) =>
      game.id === GAME_ID
        ? { ...game, status: "final", period: 3, away: { ...game.away, winner: true } }
        : game,
    ),
  };
  pushState(over);
  const final = page.getByRole("region", { name: "Final" });
  await expect(final.getByRole("link", { name: /NSH at TOR, final/ })).toBeVisible();
  expect(rerenders).toBe(0);

  // The Scoreboard has recorded the final and invalidated what the server said about the game
  // (standings, records): it moves `invalidatedAt`, and the page has the server render it again.
  const rerender = page.waitForRequest((request) => request.headers().rsc === "1");
  pushState({ ...over, invalidatedAt: "2031-01-16T01:02:33.000Z" });
  await (await rerender).response();
  expect(rerenders).toBe(1);
  // The server's first paint is older than the socket's news and does not replace it.
  await expect(final.getByRole("row")).toHaveCount(2);
  await expect(entry).toHaveText(/NSH 2.*TOR 1.*final/);

  // A game leads to its own page (#50 builds what is there).
  await entry.click();
  await expect(page).toHaveURL(new RegExp(`/nhl/games/${GAME_ID}$`));
});
