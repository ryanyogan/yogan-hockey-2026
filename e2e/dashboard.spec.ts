import { expect, test } from "./test";

// Fixture mode: nine games still to be played, Nashville at Toronto the second of them by start,
// so it is one of the three leads. Toronto (21) is the recorded team. The picks are
// `picks.setup.ts`'s: Toronto at 58%, and a season of 3 right, 2 wrong.
const GAME_ID = "401892449";

type Game = { id: string; home: object; away: object; [field: string]: unknown };
type Slate = { games: Game[]; [field: string]: unknown };

test("Home writes the slate up as ruled columns and briefs, and follows the Scoreboard without a game changing place until its status does", async ({
  page,
}) => {
  // The browser still holds the favorites an earlier build of the site kept there (#223).
  await page.addInitScript(() => {
    localStorage.setItem("favorite_teams", '["21"]');
    localStorage.setItem("favorite_players", '["4024123"]');
  });
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

  // The roundup: three leads, each a column of one ruled row, and the rest as briefs.
  const roundup = page.getByRole("region", { name: "NHL Roundup" });
  const briefs = page.getByRole("region", { name: "Around the league" });
  await expect(roundup.getByRole("article")).toHaveCount(3);
  await expect(roundup.locator('[data-slot="roundup-kicker"]')).toHaveText("Nine to come");
  // The columns are one height, whatever each holds, and end on the same floor.
  const boxes = await roundup
    .getByRole("article")
    .evaluateAll((columns) => columns.map((column) => column.getBoundingClientRect()));
  expect(new Set(boxes.map((box) => box.height)).size).toBe(1);
  expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
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
  await expect(toronto.locator('[data-slot="on-tv"]')).toHaveText("On TV: ESPN+ · Scripps Sports");
  // ESPN's headlines (the recorded news), each a link out to ESPN, and in the page as it was sent.
  const news = page.getByRole("region", { name: "Headlines" });
  await expect(news.locator('[data-slot="news-from"]')).toHaveText(/^From ESPN · \w{3} \w{3} \d+$/);
  await expect(news.getByRole("listitem")).toHaveCount(6);
  await expect(news.getByRole("link").first()).toHaveAttribute(
    "href",
    "https://www.espn.com/nhl/recap?gameId=401892485",
  );
  const sent = await (await page.request.get("/")).text();
  expect(sent.match(/data-slot="news-item"/g)).toHaveLength(6);
  const games = page.locator('[data-slot="story"] h3 a, [data-slot="brief"] > a');
  const order = () => games.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  const initialOrder = await order();
  expect(initialOrder).toHaveLength(9);

  // Standings: each conference's top eight, one table over the other, each team a link, and a
  // way to the rest.
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
  await expect(roundup.locator('[data-slot="roundup-kicker"]')).toHaveText("One live");
  await expect(toronto.getByRole("heading")).toHaveText("Predators 0, Maple Leafs 0");
  await expect(toronto.getByRole("columnheader")).toHaveText(["Team", "Rec", "Now"]);
  await expect(toronto.locator('[data-slot="pick-outcome"]')).toHaveCount(0);
  expect(await order()).toEqual(initialOrder);
  await expect(page.getByRole("region", { name: "Tonight at a glance" })).toHaveText(
    "Tonight at a glanceLive1To come8Final0",
  );
  // What an earlier build left in the browser is never read: no heart, no star, no Favorites.
  await expect(page.getByRole("button", { name: /favorite/i })).toHaveCount(0);
  await expect(page.getByText(/favorite/i)).toHaveCount(0);

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

  // On a phone the page is one column: both conferences, one over the other, the glance under
  // the picks, each lead under the one before; nothing scrolls sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(standings.getByRole("table")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Tonight at a glance" })).toBeVisible();
  const lefts = await roundup
    .getByRole("article")
    .evaluateAll((columns) => columns.map((column) => column.getBoundingClientRect().left));
  expect(new Set(lefts).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
