// Shoots every route at 390px and 1440px in light and dark, and measures each page, for the
// comparison against the approved prototype (docs/design/tuned-ledger.md).
//
//   node scripts/look-shots.mjs [baseURL] [outDir] [name-prefix]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes). It
// seeds the sample picks through /skeleton/picks first. Beside the shots it writes
// manifest.json: per shot the font, the type sizes, the row heights, sideways overflow and
// browser errors; and contrast.json: the text and rule colours as the browser drew them, with
// their WCAG ratio against the page. It exits 1 when a page overflows, logs an error, misses the
// font or shows the wrong theme.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [baseURL = "http://localhost:5173", outDir = "docs/design/approved-look", only] =
  process.argv.slice(2);
await mkdir(outDir, { recursive: true });

const TEAM = "21";
const PLAYER = "4024123";
const FINAL_GAME = "401803652";
const SCHEDULED_GAME = "401892449";

const ROUTES = [
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

const WIDTHS = { 390: 844, 1440: 900 };
const THEMES = ["light", "dark"];

/** WCAG 2.x relative luminance and contrast, from the `rgb()` strings the browser reports. */
function luminance([r, g, b]) {
  const [x, y, z] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * x + 0.7152 * y + 0.0722 * z;
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}
const channels = (rgb) =>
  rgb
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number);
const hex = (rgb) =>
  `#${channels(rgb)
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;

/** The roles of the prototype's contrast table, each read from an element that draws it. */
const ROLES = [
  ["Body text, scores", "body", "color"],
  ["Notes, idle links, second lines", '[data-slot="ledger-cell"][data-tone="note"]', "color"],
  ["Column headers, counts", 'th[data-slot="ledger-column"]', "color"],
  ["Asides: records, ranks, footer", '[data-slot="ledger-aside"]', "color"],
  ["Live marker", ".text-live", "color"],
  ["Rule under a row", '[data-slot="ledger-row"]', "borderBottomColor"],
  ["Rule under a column header", 'th[data-slot="ledger-column"]', "borderBottomColor"],
  ["Rules framing the shell", '[data-slot="score-ticker"]', "borderBottomColor"],
];
const LIVE_ROLES = [
  ["Body text on a live row", '[data-slot="ledger-row"][data-live] [data-slot="ledger-cell"]'],
  ["Asides on a live row", '[data-slot="ledger-row"][data-live] [data-slot="ledger-aside"]'],
];

async function seedPicks(browser) {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/skeleton/picks`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Seed picks, the final's right" }).click();
  await page.locator('[data-slot="picks-seeded"]', { hasText: "pick is right" }).waitFor();
  await page.close();
}

const browser = await chromium.launch();
await seedPicks(browser);
const manifest = { baseURL, fixtureMode: true, capturedAt: new Date().toISOString(), pages: [] };
const colours = [];

for (const route of ROUTES) {
  if (only && !route.name.startsWith(only)) continue;
  for (const [width, height] of Object.entries(WIDTHS)) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: Number(width), height },
        deviceScaleFactor: width === "390" ? 2 : 1,
        hasTouch: width === "390",
        timezoneId: "America/Chicago",
        reducedMotion: "reduce",
      });
      // The site's own toggle wins over the operating system, so the theme is set where it reads.
      await context.addInitScript(
        ([chosen, team, player]) => {
          localStorage.setItem("theme", chosen);
          localStorage.setItem("favorite_teams", JSON.stringify([team]));
          localStorage.setItem("favorite_players", JSON.stringify([player]));
        },
        [theme, TEAM, PLAYER],
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(`${baseURL}${route.path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      if (route.waitFor) await page.locator(route.waitFor).first().waitFor();
      await page.waitForTimeout(300);
      if (route.overlay) {
        await page.evaluate(() => {
          document.getElementById("__vinext_dev_error_overlay_root")?.remove();
        });
      }
      const measured = await page.evaluate(() => {
        const visible = (selector) =>
          [...document.querySelectorAll(selector)].find(
            (candidate) => candidate.getClientRects().length > 0,
          );
        const style = (selector, property) => {
          const element = visible(selector);
          return element ? getComputedStyle(element)[property] : null;
        };
        const height = (selector) => {
          const rect = visible(selector)?.getBoundingClientRect();
          return rect == null ? null : Math.round(rect.height * 10) / 10;
        };
        const family = getComputedStyle(document.body).fontFamily.split(",")[0];
        return {
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          overflow: document.documentElement.scrollWidth - innerWidth,
          font: family,
          fontLoaded: document.fonts.check(`${getComputedStyle(document.body).fontSize} ${family}`),
          bodySize: style("body", "fontSize"),
          bodyWeight: style("body", "fontWeight"),
          smallSize: style('th[data-slot="ledger-column"]', "fontSize"),
          scoreSize: style('[data-slot="ledger-cell"][data-tone="score"]', "fontSize"),
          row: height('[data-slot="ledger-body"] [data-slot="ledger-row"]'),
          tab: height('[data-slot="url-tabs"] a'),
          strip: height('[data-slot="score-ticker"]'),
        };
      });
      const failed = [];
      if (measured.theme !== theme) failed.push(`theme is ${measured.theme}`);
      if (measured.overflow > 0) failed.push(`overflows by ${measured.overflow}px`);
      if (!measured.fontLoaded) failed.push("font not loaded");
      if (errors.length > 0 && !route.overlay) failed.push("browser errors");
      if (!route.overlay && response?.status() !== (route.status ?? 200))
        failed.push(`status ${response?.status()}`);

      // The contrast table is read from the pages that draw every role: home and the live sample.
      if (route.name === "home" || route.name === "sample-live") {
        const read = await page.evaluate(
          ([roles, liveRoles]) => {
            const visible = (selector) =>
              [...document.querySelectorAll(selector)].find(
                (candidate) => candidate.getClientRects().length > 0,
              );
            const of = (selector, property) => {
              const element = visible(selector);
              return element ? getComputedStyle(element)[property] : null;
            };
            const liveRow = visible('[data-slot="ledger-row"][data-live]');
            return {
              page: getComputedStyle(document.body).backgroundColor,
              tint: liveRow ? getComputedStyle(liveRow).backgroundColor : null,
              roles: roles.map(([use, selector, property]) => [use, of(selector, property)]),
              live: liveRoles.map(([use, selector]) => [use, of(selector, "color")]),
            };
          },
          [ROLES, LIVE_ROLES],
        );
        const row = (use, colour, against) =>
          colour == null
            ? null
            : {
                width: Number(width),
                theme,
                page: route.name,
                use,
                colour: hex(colour),
                ratio: contrast(channels(colour), channels(against)),
              };
        for (const [use, colour] of read.roles) colours.push(row(use, colour, read.page));
        if (read.tint)
          for (const [use, colour] of read.live) colours.push(row(use, colour, read.tint));
      }

      const file = `${route.name}-${width}-${theme}.png`;
      // A viewport as tall as the page, so anything fixed is drawn once, where it sits.
      const tall = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: Number(width), height: Math.max(tall, height) });
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${outDir}/${file}` });
      manifest.pages.push({
        file,
        path: route.path,
        status: response?.status(),
        ...measured,
        errors,
        failed,
      });
      await context.close();
    }
  }
}
await browser.close();

if (!only) {
  await writeFile(`${outDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    `${outDir}/contrast.json`,
    `${JSON.stringify(colours.filter(Boolean), null, 2)}\n`,
  );
}
const bad = manifest.pages.filter((page) => page.failed.length > 0);
console.log(`${manifest.pages.length} shots, ${bad.length} failed`);
for (const page of bad) console.log(page.file, page.failed.join("; "), page.errors.join(" | "));
process.exit(bad.length > 0 ? 1 : 0);
