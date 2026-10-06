// Screenshots of the error page and of the reconnect notices, for docs/design/errors.
//
//   node scripts/error-shots.ts [baseURL] [outDir] [pages|game]
//
// `pages` (the default) needs a build in fixture mode served by `vite preview`, since the dev
// server draws its own error overlay over the page. `game` needs the dev server in fixture mode,
// whose D1 has the tables a finished game's Agent writes to. Both need TMPDIR set (see the build
// notes). It also says what it saw, since a
// notice that comes and goes with a socket has no smoke test: the status of the failed page, how
// long each notice took to appear, and that each went when its socket came back.
import { chromium, type Page, type WebSocketRoute } from "@playwright/test";
import { driveGame, recordedGame, SCHEDULED_GAME } from "../e2e/game-driver.ts";

const [baseURL = "http://localhost:5284", outDir = "docs/design/errors", part = "pages"] =
  process.argv.slice(2);
const SIZES = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
const browser = await chromium.launch();

const open = (scheme: "light" | "dark", viewport: { width: number; height: number }) =>
  browser.newPage({ viewport, colorScheme: scheme, timezoneId: "America/Chicago" });

/** The Scoreboard's socket passed through, with a switch that takes it down. */
async function scoreboardSwitch(page: Page) {
  let down = false;
  const sockets: WebSocketRoute[] = [];
  await page.routeWebSocket(/\/agents\/scoreboard-agent\/main/, (socket) => {
    if (down) return void socket.close();
    socket.connectToServer();
    sockets.push(socket);
  });
  return (isDown: boolean) => {
    down = isDown;
    if (down) for (const socket of sockets.splice(0)) void socket.close();
  };
}

for (const scheme of part === "pages" ? (["light", "dark"] as const) : []) {
  for (const viewport of SIZES) {
    const name = `${viewport.width}-${scheme}`;

    // A team with no recording: the read fails as it does when ESPN is down.
    const failed = await open(scheme, viewport);
    const response = await failed.goto(`${baseURL}/nhl/teams/1`, { waitUntil: "networkidle" });
    await failed.evaluate(() => document.fonts.ready);
    await failed.locator('[data-slot="error-page"]').waitFor();
    await failed.screenshot({ path: `${outDir}/error-team-${name}.png` });
    console.log(`${name}: /nhl/teams/1 answered ${response?.status()}`);
    await failed.close();

    // The Scoreboard's socket dropped under an open page.
    const live = await open(scheme, viewport);
    const scoreboardDown = await scoreboardSwitch(live);
    await live.goto(`${baseURL}/nhl/live`, { waitUntil: "networkidle" });
    await live.evaluate(() => document.fonts.ready);
    const notice = live.locator('[data-slot="scoreboard-notice"]');
    scoreboardDown(true);
    const droppedAt = Date.now();
    await live.waitForTimeout(2000);
    const early = await notice.count();
    await notice.waitFor();
    console.log(`${name}: scoreboard notice after ${Date.now() - droppedAt} ms (at 2 s: ${early})`);
    await live.screenshot({ path: `${outDir}/reconnecting-scores-${name}.png` });
    scoreboardDown(false);
    await notice.waitFor({ state: "detached", timeout: 30_000 });
    console.log(`${name}: scoreboard notice gone ${Date.now() - droppedAt} ms after the drop`);
    await live.close();
  }
}

// The Game Agent's socket dropped under a live game.
const game = part === "game" ? await recordedGame(baseURL) : null;
for (const viewport of game == null ? [] : SIZES) {
  const midSecond =
    game.plays.findLastIndex((play) => play.type === "period-end" && play.period === 2) - 40;
  const page = await open("light", viewport);
  const driver = await driveGame(page, SCHEDULED_GAME);
  await page.goto(`${baseURL}/nhl/games/${SCHEDULED_GAME}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const header = game.liveAfter(midSecond, 2);
  driver.agent({ header, delayed: false, archived: false }, game.plays.slice(0, midSecond));
  await driver.scoreboard({ status: "live", period: 2, clock: "8:12", scores: header });
  await page.locator('[data-slot="game-view"]').waitFor();
  const notice = page.locator('[data-slot="rink-notice"]');
  console.log(`game ${viewport.width}: notice while connected: ${await notice.count()}`);
  driver.agentDown(true);
  const droppedAt = Date.now();
  await notice.filter({ hasText: "Reconnecting" }).waitFor();
  console.log(
    `game ${viewport.width}: "${await notice.innerText()}" after ${Date.now() - droppedAt} ms`,
  );
  await page.screenshot({ path: `${outDir}/reconnecting-game-${viewport.width}-light.png` });
  driver.agentDown(false);
  await notice.waitFor({ state: "detached", timeout: 30_000 });
  console.log(`game ${viewport.width}: notice gone ${Date.now() - droppedAt} ms after the drop`);
  await page.close();
}
await browser.close();
