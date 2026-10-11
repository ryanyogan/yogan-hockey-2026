// The pages the look scripts open (look-shots.mjs, look-audit.mjs): every route of the site in
// fixture mode, and the two sample pages that draw what the recorded fixtures cannot.

export const TEAM = "21";
export const PLAYER = "4024123";
const FINAL_GAME = "401803652";
const SCHEDULED_GAME = "401892449";

export const ROUTES = [
  { name: "home", path: "/", waitFor: '[data-slot="picks-record"]' },
  { name: "scores", path: "/nhl/live" },
  { name: "standings", path: "/nhl" },
  { name: "teams", path: "/nhl?tab=teams" },
  { name: "team", path: `/nhl/teams/${TEAM}` },
  { name: "roster", path: `/nhl/teams/${TEAM}/roster` },
  { name: "stats", path: `/nhl/teams/${TEAM}/stats` },
  { name: "players", path: "/players" },
  { name: "player", path: `/players/${PLAYER}` },
  { name: "player-games", path: `/players/${PLAYER}/games` },
  { name: "game", path: `/nhl/games/${FINAL_GAME}` },
  { name: "game-scoring", path: `/nhl/games/${FINAL_GAME}/scoring` },
  { name: "game-pick", path: `/nhl/games/${FINAL_GAME}/pick` },
  { name: "game-scheduled", path: `/nhl/games/${SCHEDULED_GAME}` },
  { name: "not-found", path: "/no-such-page", status: 404 },
  // A team with no recording: the read fails as it does when ESPN is down. The dev server lays
  // its overlay over this one; the page under it is what is measured.
  { name: "error", path: "/nhl/teams/1", status: 503, overlay: true },
  // Sample pages: a slate with games in progress, and every route's placeholders held still.
  { name: "sample-live", path: "/skeleton/live" },
  { name: "sample-loading", path: "/skeleton/loading" },
];

export const WIDTHS = { 390: 844, 1440: 900 };
export const THEMES = ["light", "dark"];

/** Seeds the sample picks the game rows then show, as the smoke tests' setup does. */
export async function seedPicks(browser, baseURL) {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/skeleton/picks`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Seed picks, the final's right" }).click();
  await page.locator('[data-slot="picks-seeded"]', { hasText: "pick is right" }).waitFor();
  await page.close();
}

/** The dev server's error overlay is a shadow root over the page; the page under it is the subject. */
export async function removeDevOverlay(page) {
  await page.evaluate(() => {
    document.getElementById("__vinext_dev_error_overlay_root")?.remove();
  });
}
