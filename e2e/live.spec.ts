import { expect, test } from "./test";

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
  // Every call of a server function. This page makes none of its own once it is drawn,
  // so each one is a loader reading: this page's again, or the page of a
  // link the pointer rests on, read ahead (`defaultPreload` in `src/router.tsx`).
  let rereads = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/_serverFn/")) rereads += 1;
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
  // A team's abbreviation and its agate name are both in the markup; a width shows one.
  await expect(row.getByRole("cell").nth(1)).toHaveText("NSHNashville 1-1-0");
  await expect(row.getByRole("cell").nth(3)).toHaveText("TORToronto 1-2-0");
  await expect(row.getByText("Nashville", { exact: true })).toBeVisible();
  await expect(row.getByText("NSH", { exact: true })).toBeHidden();
  // No row has a team's mark; the strip above keeps its own.
  await expect(page.locator("main [data-slot=team-mark]")).toHaveCount(0);
  await expect(row.locator('[data-slot="game-pick"]')).toHaveText("TOR 58%");
  await expect(row.getByRole("cell").last()).toHaveText(
    "TOR 58%Scotiabank Arena · ESPN+, Scripps Sports",
  );

  // The ticker, on this page as on every other: a way to the scores, then one entry per game.
  const ticker = page.getByRole("navigation", { name: "Scores" });
  await expect(ticker.getByRole("link")).toHaveCount(10);
  const entry = ticker.locator(`a[href="/nhl/games/${GAME_ID}"]`);
  await expect(entry).toHaveText(/NSH.*TOR.*6:00 PM$/);
  // Nothing has been read since the page was drawn. From here the pointer is on the strip, where
  // resting on a game reads that game's page ahead, so the count starts again once it has left.
  expect(rereads).toBe(0);
  // Nine games are wider than the strip, and a plain vertical wheel reaches the rest.
  const strip = ticker.getByRole("list");
  await expect(async () => {
    await strip.hover();
    await page.mouse.wheel(0, 300);
    expect(await strip.evaluate((list) => list.scrollLeft)).toBeGreaterThan(0);
  }).toPass();

  // On a phone the strip shows three games at a time, so the count at its end opens the whole
  // slate beneath it: every game a row, none of them past the edge of the page.
  const desktop = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await ticker.getByRole("button", { name: "All 9 games" }).click();
  const wholeSlate = ticker.getByRole("list", { name: "All of today's games" });
  await expect(wholeSlate.getByRole("link")).toHaveCount(9);
  await expect(wholeSlate.locator(`a[href="/nhl/games/${GAME_ID}"]`)).toBeInViewport({ ratio: 1 });
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sideways).toBe(0);
  await page.keyboard.press("Escape");
  await expect(wholeSlate).toBeHidden();
  // The restored note moves below status on tablets too; a fixed-width note must not hide a pick.
  for (const width of [320, 390, 640, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const visiblePick = row.getByText("TOR 58%", { exact: true }).filter({ visible: true });
    await expect(visiblePick).toBeVisible();
    expect(
      await visiblePick.evaluate((node) => {
        const cell = node.closest("td");
        return (
          cell != null && node.getBoundingClientRect().right <= cell.getBoundingClientRect().right
        );
      }),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
  }
  if (desktop != null) await page.setViewportSize(desktop);
  // The pointer off every link, and what it read ahead on the way forgotten.
  await page.getByRole("heading", { name: /Live scores/ }).hover();
  rereads = 0;

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
  await expect(ticker.getByRole("link").nth(1)).toHaveAttribute("href", `/nhl/games/${GAME_ID}`);

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
  await expect(final.getByRole("link", { name: /NSH at TOR, Final/ })).toBeVisible();
  expect(rereads).toBe(0);

  // The Scoreboard has recorded the final and forgotten what the server said about the game
  // (standings, records): it moves `invalidatedAt`, and the page's loaders are run again, the
  // root route's and this page's.
  pushState({ ...over, invalidatedAt: "2031-01-16T01:02:33.000Z" });
  await expect.poll(() => rereads).toBe(2);
  // And no more than those two.
  await page.waitForTimeout(500);
  expect(rereads).toBe(2);
  // The root loader's read is older than the socket's news and does not replace it.
  await expect(final.getByRole("row")).toHaveCount(2);
  await expect(entry).toHaveText(/NSH 2.*TOR 1.*final/);

  // A game leads to its own page (#50 builds what is there).
  await entry.click();
  await expect(page).toHaveURL(new RegExp(`/nhl/games/${GAME_ID}$`));
});
