import { expect, test } from "./test";

// Fixture mode: nine games still to be played, Nashville at Toronto the second of them by start,
// so it is one of the three leads. Toronto (21) is the recorded team and Auston Matthews
// (4024123) its recorded player. The picks are `picks.setup.ts`'s: Toronto at 58%, and a season
// of 3 right, 2 wrong.
const GAME_ID = "401892449";
const MATTHEWS = "4024123";

type Game = { id: string; home: object; away: object; [field: string]: unknown };
type Slate = { games: Game[]; [field: string]: unknown };

test("Home writes the slate up as leads and briefs, and follows the Scoreboard without a game changing place until its status does", async ({
  page,
}) => {
  // The visitor already has a favorite player.
  await page.addInitScript((player) => {
    localStorage.setItem("favorite_players", JSON.stringify([player]));
  }, MATTHEWS);
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
  // Home is the site: its title is the site's name, and the wordmark is its one `h1`.
  await expect(page).toHaveTitle("Yogan Hockey");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yogan Hockey");

  // The roundup: three leads, each a story, and the rest as briefs.
  const roundup = page.getByRole("region", { name: "NHL Roundup" });
  const briefs = page.getByRole("region", { name: "Around the league" });
  await expect(roundup.getByRole("article")).toHaveCount(3);
  await expect(briefs.getByRole("listitem")).toHaveCount(6);
  const gameLink = `a[href="/nhl/games/${GAME_ID}"]`;
  const toronto = roundup.getByRole("article").filter({ has: page.locator(gameLink) });
  await expect(toronto.getByRole("heading")).toHaveText("Predators at Maple Leafs");
  await expect(toronto.locator('[data-slot="kicker"]')).toHaveText(
    /^\d{1,2}:\d{2} [AP]M · Scotiabank Arena$/,
  );
  await expect(toronto.locator('[data-slot="deck"]')).toHaveText(
    /^The Predators \(.+\) visit the Maple Leafs \(.+\)\.$/,
  );
  // The line score is a table that says what it is, each team a row header; no score yet.
  const lineScore = toronto.getByRole("table", { name: "Predators at Maple Leafs: line score" });
  await expect(lineScore.getByRole("columnheader")).toHaveText(["Team", "Rec"]);
  await expect(lineScore.getByRole("rowheader")).toHaveText(["Nashville", "Toronto"]);
  await expect(toronto.locator('[data-slot="story-pick"]')).toHaveText("Our pick: Toronto, 58%.");
  await expect(toronto.locator('[data-slot="pick-outcome"]')).toHaveCount(0);
  await expect(toronto.locator('[data-slot="on-tv"]')).toHaveText("On TV ESPN+, Scripps Sports");
  const games = page.locator('[data-slot="story"] h3 a, [data-slot="brief"] > a');
  const order = () => games.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  const initialOrder = await order();
  expect(initialOrder).toHaveLength(9);

  // The lower band. Standings: each conference's top eight, each team a link, and a way to the rest.
  const standings = page.getByRole("region", { name: "Standings" });
  for (const conference of ["Eastern Conference", "Western Conference"]) {
    const table = standings.getByRole("table", { name: conference });
    await expect(table.getByRole("row")).toHaveCount(9);
    await expect(table.getByRole("columnheader")).toHaveText(["Team", "GP", "W", "L", "OT", "PTS"]);
    await expect(table.getByRole("row").nth(1).getByRole("link")).toHaveAttribute(
      "href",
      /^\/nhl\/teams\/\d+$/,
    );
  }
  await expect(standings.getByRole("link", { name: "Full standings" })).toHaveAttribute(
    "href",
    "/nhl?view=conference",
  );
  // The Picks: the season's record, and nothing of tonight before a game is final.
  const picks = page.getByRole("region", { name: "The Picks" });
  await expect(picks.locator('[data-slot="picks-record"]')).toHaveText("3–2");
  await expect(picks).toContainText("Right on 60% of games this season.");
  await expect(picks).not.toContainText("tonight");
  await expect(page.getByRole("region", { name: "Tonight at a glance" })).toHaveText(
    "Tonight at a glanceLive0To come9Final0",
  );
  // Favorites: the favorite player with his club and his season, not playing yet.
  const favorites = page.getByRole("region", { name: "Favorites" });
  const matthews = favorites.getByRole("listitem").filter({ hasText: "Auston Matthews" });
  await expect(matthews).toContainText(/\d+ GP · \d+ G · \d+ A · \d+ PTS/);
  await expect(
    matthews.getByRole("link", { name: "Auston Matthews", exact: true }),
  ).toHaveAttribute("href", `/players/${MATTHEWS}`);
  await expect(matthews.getByTitle("Toronto Maple Leafs")).toHaveText("TORToronto Maple Leafs");
  await expect(matthews.getByRole("link", { name: /live now/ })).toHaveCount(0);
  await expect(favorites.getByRole("link", { name: "All players" })).toHaveAttribute(
    "href",
    "/players",
  );

  // The Scoreboard says Toronto's game is on: the story follows without a refresh, in its place.
  await expect.poll(() => slate, { message: "the socket delivered the slate" }).toBeDefined();
  if (!slate) throw new Error("no slate");
  const playing = (change: (game: Game) => Game): Slate => ({
    ...(slate as Slate),
    games: (slate as Slate).games
      .toReversed()
      .map((game) => (game.id === GAME_ID ? change(game) : game)),
  });
  pushState(playing((game) => ({ ...game, status: "live", period: 2, clock: "12:34" })));
  await expect(toronto).toHaveAttribute("data-live", "");
  await expect(toronto.locator('[data-slot="kicker"]')).toHaveText(
    "Live · 2nd 12:34 · Scotiabank Arena",
  );
  // The dot is for the eye: "Live" is in the words.
  await expect(toronto.locator('[data-slot="live-dot"]')).toHaveAttribute("aria-hidden", "true");
  await expect(toronto.getByRole("heading")).toHaveText("Predators 0, Maple Leafs 0");
  await expect(toronto.getByRole("columnheader")).toHaveText(["Team", "Rec", "Now"]);
  await expect(toronto.locator('[data-slot="pick-outcome"]')).toHaveCount(0);
  expect(await order()).toEqual(initialOrder);
  await expect(page.getByRole("region", { name: "Tonight at a glance" })).toHaveText(
    "Tonight at a glanceLive1To come8Final0",
  );
  await expect(
    matthews.getByRole("link", { name: "Auston Matthews's game, live now" }),
  ).toHaveAttribute("href", `/nhl/games/${GAME_ID}`);

  // The game ends, Toronto winning: its status changed, so it gives its place among the leads to
  // a game still to come and is a brief, its pick marked; The Picks counts it.
  pushState(
    playing((game) => ({
      ...game,
      status: "final",
      period: 3,
      home: { ...game.home, score: 3, winner: true },
      away: { ...game.away, score: 1 },
    })),
  );
  const brief = briefs.getByRole("listitem").filter({ has: page.locator(gameLink) });
  await expect(brief.getByRole("link")).toHaveText("Toronto 3, Nashville 1");
  await expect(brief.locator('[data-slot="brief-status"]')).toHaveText("Final");
  await expect(brief.locator('[data-slot="brief-pick"]')).toHaveText("TOR 58% Right");
  await expect(brief.locator('[data-slot="pick-outcome"]')).toHaveText("Right");
  await expect(roundup.getByRole("article")).toHaveCount(3);
  await expect(roundup.locator(gameLink)).toHaveCount(0);
  await expect(picks).toContainText("Right on 60% of games this season. One of one tonight.");

  // On a phone the standings show one conference at a time, by the control above them.
  await page.setViewportSize({ width: 390, height: 844 });
  const control = standings.getByRole("group", { name: "Conference" });
  await expect(control.getByRole("button", { name: "Eastern" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(standings.getByRole("table")).toHaveCount(1);
  const eastern = await standings.getByRole("table").getByRole("row").nth(1).textContent();
  await control.getByRole("button", { name: "Western" }).click();
  await expect(control.getByRole("button", { name: "Western" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(control.getByRole("button", { name: "Eastern" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(standings.getByRole("table")).toHaveCount(1);
  await expect(standings.getByRole("table").getByRole("row").nth(1)).not.toHaveText(eastern ?? "");
  // The phone's dateline says the counts, so the glance is not drawn; nothing scrolls sideways.
  await expect(page.getByRole("region", { name: "Tonight at a glance" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
