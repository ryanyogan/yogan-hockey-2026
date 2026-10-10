import { expect, test } from "@playwright/test";

// Fixture mode: nine games still to be played, Nashville at Toronto the second of them by start.
// Toronto (21) is the recorded team and Auston Matthews (4024123) its recorded player.
const GAME_ID = "401892449";
const TORONTO = "21";
const MATTHEWS = "4024123";

type Slate = { games: { id: string; [field: string]: unknown }[]; [field: string]: unknown };

test("the dashboard keeps games in start order while favorites and live details update", async ({
  page,
}) => {
  // The visitor already has a favorite team and a favorite player.
  await page.addInitScript(
    ([team, player]) => {
      localStorage.setItem("favorite_teams", JSON.stringify([team]));
      localStorage.setItem("favorite_players", JSON.stringify([player]));
    },
    [TORONTO, MATTHEWS],
  );
  // The test stands between the page and the Scoreboard, to send a state of its own later.
  let slate: Slate | undefined;
  let pushState: (state: Slate) => void = () => {};
  await page.routeWebSocket(/\/agents\/scoreboard-agent\/main/, (socket) => {
    const agent = socket.connectToServer();
    agent.onMessage((message) => {
      const parsed = JSON.parse(String(message));
      if (parsed.type === "cf_agent_state") slate = parsed.state;
      socket.send(message);
    });
    pushState = (state) => socket.send(JSON.stringify({ type: "cf_agent_state", state }));
  });

  await page.goto("/");
  await expect(page).toHaveTitle("Dashboard · Yogan Hockey");
  await expect(page.getByRole("heading", { name: "Games", exact: true })).toBeVisible();

  // Tonight: every game in start order, with favorites marked without being promoted.
  const tonight = page.getByRole("region", { name: "Tonight" });
  await expect(tonight.getByRole("heading")).toHaveText("Tonight 9 games");
  await expect(tonight.getByRole("row")).toHaveCount(10);
  const toronto = tonight.getByRole("row").nth(2);
  await expect(tonight.getByRole("row").nth(1)).toContainText("CAR at MTL");
  await expect(tonight.getByRole("row").nth(1)).not.toContainText("favorite team");
  await expect(toronto).toContainText("NSH at TOR");
  await expect(toronto).toContainText("favorite team");
  await expect(toronto.locator('[data-slot="game-pick"]')).toHaveText("TOR 58%");
  await expect(toronto.getByRole("cell").last()).toHaveText(
    "Scotiabank Arena · ESPN+, Scripps Sports",
  );
  await expect(toronto.getByRole("link")).toHaveAttribute("href", `/nhl/games/${GAME_ID}`);
  await expect(toronto.locator("time")).toBeVisible();
  const gameLinks = tonight.locator("tbody a");
  const initialOrder = await gameLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  );
  await expect(tonight.getByRole("link", { name: "all scores" })).toHaveAttribute(
    "href",
    "/nhl/live",
  );

  await expect(page.getByRole("region", { name: "Family" })).toHaveCount(0);

  // Favorites: the favorite player with his season, not playing yet.
  const favorites = page.getByRole("region", { name: "Favorites" });
  const matthews = favorites.getByRole("row").filter({ hasText: "Auston Matthews" });
  await expect(matthews).toContainText(/\d+ GP · \d+ G · \d+ A · \d+ PTS/);
  await expect(
    matthews.getByRole("link", { name: "Auston Matthews", exact: true }),
  ).toHaveAttribute("href", `/players/${MATTHEWS}`);
  await expect(matthews.getByText("live")).toHaveCount(0);
  // His team is drawn as its abbreviation and named in full.
  await expect(matthews.getByTitle("Toronto Maple Leafs")).toHaveText("TORToronto Maple Leafs");

  // Standings: each conference's top eight, each team a link, and a way to the rest.
  const east = page.getByRole("region", { name: "Eastern Conference" });
  const west = page.getByRole("region", { name: "Western Conference" });
  await expect(east.getByRole("row")).toHaveCount(9);
  await expect(west.getByRole("row")).toHaveCount(9);
  await expect(east.getByRole("row").nth(1).getByRole("link")).toHaveAttribute(
    "href",
    /^\/nhl\/teams\/\d+$/,
  );
  await expect(east.getByRole("link", { name: "full standings" })).toHaveAttribute(
    "href",
    "/nhl?view=conference",
  );

  // The Scoreboard says Toronto's game is on: the page follows without a refresh.
  await expect.poll(() => slate, { message: "the socket delivered the slate" }).toBeDefined();
  if (!slate) throw new Error("no slate");
  pushState({
    ...slate,
    games: slate.games
      .toReversed()
      .map((game) =>
        game.id === GAME_ID ? { ...game, status: "live", period: 2, clock: "12:34" } : game,
      ),
  });
  await expect(tonight.getByRole("heading")).toHaveText("Tonight 9 games, 1 live");
  await expect(toronto.getByRole("link")).toHaveText("NSH at TOR, live, 2nd 12:34");
  await expect(toronto).toHaveAttribute("data-live", "");
  await expect(toronto.locator('[data-slot="game-pick"]')).toHaveText("TOR 58%");
  expect(
    await gameLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual(initialOrder);
  const live = matthews.getByRole("link", { name: "Auston Matthews's game, live now" });
  await expect(live).toHaveAttribute("href", `/nhl/games/${GAME_ID}`);

  // A favorite change from another tab updates the marker, never the home row order.
  await page.evaluate(() => {
    localStorage.setItem("favorite_teams", "[]");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "favorite_teams",
        newValue: "[]",
        storageArea: localStorage,
      }),
    );
  });
  await expect(toronto).not.toContainText("favorite team");
  expect(
    await gameLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual(initialOrder);
});
