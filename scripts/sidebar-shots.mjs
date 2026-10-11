// Shoots the desktop shell for the sidebar's record (docs/design/sidebar/): Home, a game and
// Standings at 1440px and at 768px, the narrowest width the sidebar shows at, in light and dark.
//
//   node scripts/sidebar-shots.mjs [baseURL] [outDir] [prefix] [--slate=live|quiet|empty]
//     [--height=480] [--only=home] [--widths=1440]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes).
// `--slate` plays the Scoreboard on the page's socket with a sample slate from `/skeleton/live`
// (games in progress, two games, or a day with none), which no recorded slate has. Per shot it
// prints where the sidebar's rules fall beside the shell's, the layout shift, and whether anything
// in the sidebar is cut off; it exits 1 when a rule misses or something is cut off.
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import {
  EMPTY_SLATE,
  QUIET_SLATE,
  SAMPLE_SLATE,
} from "../apps/web/app/skeleton/live/sample-slate.ts";

const args = process.argv.slice(2);
const flag = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const [baseURL = "http://localhost:5173", outDir = "docs/design/sidebar", prefix = "after"] =
  args.filter((arg) => !arg.startsWith("--"));
const SLATES = { live: SAMPLE_SLATE, quiet: QUIET_SLATE, empty: EMPTY_SLATE };
const slateName = flag("slate");
const slate = slateName == null ? null : SLATES[slateName];
const height = Number(flag("height") ?? 900);
const only = flag("only");
const widths = (flag("widths") ?? "1440,768").split(",").map(Number);
await mkdir(outDir, { recursive: true });

const ROUTES = [
  { name: "home", path: "/" },
  { name: "game", path: "/nhl/games/401803652" },
  { name: "standings", path: "/nhl" },
];

const browser = await chromium.launch();
let failed = false;
for (const route of ROUTES) {
  if (only && route.name !== only) continue;
  for (const width of widths) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height },
        timezoneId: "America/Chicago",
        reducedMotion: "reduce",
      });
      // The site's own toggle wins over the operating system, so the theme is set where it reads.
      await context.addInitScript((chosen) => {
        localStorage.setItem("theme", chosen);
        // Every layout shift of the page's life, for the report below.
        window.__shift = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__shift += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
      }, theme);
      const page = await context.newPage();
      if (slate != null) {
        // The Agent's own state is swapped for the sample slate; everything else passes.
        await page.routeWebSocket(/\/agents\/scoreboard-agent\/main/, (socket) => {
          const agent = socket.connectToServer();
          agent.onMessage((message) => {
            const parsed = JSON.parse(String(message));
            if (parsed.type !== "cf_agent_state") return socket.send(message);
            socket.send(
              JSON.stringify({
                type: "cf_agent_state",
                state: { ...parsed.state, ...slate, updatedAt: new Date().toISOString() },
              }),
            );
          });
        });
      }
      await page.goto(`${baseURL}${route.path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const measured = await page.evaluate(() => {
        const round = (value) => Math.round(value * 10) / 10;
        const aside = document.querySelector("aside");
        const strip = document.querySelector('[data-slot="score-ticker"]');
        const head = aside?.querySelector('[data-slot="sidebar-head"]');
        const cut =
          aside == null
            ? []
            : [...aside.querySelectorAll("a, button, p, h2")]
                .filter((element) => {
                  const rect = element.getBoundingClientRect();
                  return (
                    rect.height > 0 &&
                    (rect.bottom > innerHeight + 0.5 ||
                      rect.right > aside.getBoundingClientRect().right + 0.5)
                  );
                })
                .map((element) => element.textContent?.trim().slice(0, 24));
        return {
          sidebarWidth: aside ? round(aside.getBoundingClientRect().width) : null,
          stripRule: strip ? round(strip.getBoundingClientRect().bottom) : null,
          headRule: head ? round(head.getBoundingClientRect().bottom) : null,
          scrolls: aside ? aside.scrollHeight > aside.clientHeight : null,
          cut,
          mainLeft: round(document.querySelector("main").getBoundingClientRect().left),
          shift: Math.round(window.__shift * 10000) / 10000,
        };
      });
      const name = [
        prefix,
        route.name,
        slateName,
        width,
        height === 900 ? null : `h${height}`,
        theme,
      ]
        .filter(Boolean)
        .join("-");
      await page.screenshot({ path: `${outDir}/${name}.png` });
      const missed = measured.headRule != null && measured.headRule !== measured.stripRule;
      // A sidebar shorter than its content scrolls inside itself, so nothing is lost; cut then
      // only says what is below the fold.
      const lost = measured.cut.length > 0 && !measured.scrolls;
      if (missed || lost) failed = true;
      console.log(
        name,
        JSON.stringify(measured),
        missed ? "RULE MISSES" : "",
        lost ? "CUT OFF" : "",
      );
      await context.close();
    }
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
