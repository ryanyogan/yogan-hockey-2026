// Every route of the site as the measuring scripts visit it in fixture mode: `tap-targets.mjs`
// measures what can be tapped on each, and the Agate scripts take a team's and a player's id here. `place` is the destination the
// shell marks as current there; a route without one (a page that is nowhere) marks none.

export const TEAM = "21";
export const PLAYER = "4024123";
const FINAL_GAME = "401803652";
const SCHEDULED_GAME = "401892449";

export const ROUTES = [
  { name: "home", path: "/", waitFor: '[data-slot="picks-record"]', place: "Home" },
  { name: "scores", path: "/nhl/live", place: "Scores" },
  { name: "standings", path: "/nhl", place: "Standings" },
  { name: "teams", path: "/nhl?tab=teams", place: "Teams" },
  { name: "team", path: `/nhl/teams/${TEAM}`, place: "Teams" },
  { name: "roster", path: `/nhl/teams/${TEAM}/roster`, place: "Teams" },
  { name: "stats", path: `/nhl/teams/${TEAM}/stats`, place: "Teams" },
  { name: "players", path: "/players", place: "Players" },
  { name: "player", path: `/players/${PLAYER}`, place: "Players" },
  { name: "player-games", path: `/players/${PLAYER}/games`, place: "Players" },
  { name: "game", path: `/nhl/games/${FINAL_GAME}`, place: "Scores" },
  { name: "game-scoring", path: `/nhl/games/${FINAL_GAME}/scoring`, place: "Scores" },
  { name: "game-pick", path: `/nhl/games/${FINAL_GAME}/pick`, place: "Scores" },
  { name: "game-scheduled", path: `/nhl/games/${SCHEDULED_GAME}`, place: "Scores" },
  { name: "not-found", path: "/no-such-page", status: 404 },
  // An id that is no team's: its own page, with a link back to the teams.
  { name: "team-not-found", path: "/nhl/teams/leafs", status: 404, place: "Teams" },
  // A team with no recording: the read fails as it does when ESPN is down. The dev server lays
  // its overlay over this one; the page under it is what is measured.
  { name: "error", path: "/nhl/teams/1", status: 503, overlay: true, place: "Teams" },
  // A sample page: a slate with games in progress.
  { name: "sample-live", path: "/skeleton/live" },
];

/** The sample picks, so a slate's rows and a game's pick tab have something to show. */
export async function seedPicks(browser, baseURL) {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/skeleton/picks`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Seed picks, the final's right" }).click();
  await page.locator('[data-slot="picks-seeded"]', { hasText: "pick is right" }).waitFor();
  await page.close();
}
