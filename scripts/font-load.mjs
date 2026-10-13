// Measures how the fonts arrive on a cold load of a production build.
//
//   ESPN_FIXTURES=1 pnpm build && (cd apps/web && pnpm exec vite preview --port <PORT> --strictPort)
//   node scripts/font-load.mjs [baseURL] [out.json]
//
// Each page is opened in a new browser context (an empty cache) at 390px and 1440px, twice: as
// the network gives it, and with the font files held back two seconds, which is the slow phone.
// It records the cumulative layout shift, whether the fonts are self-hosted and preloaded, and,
// for the held-back load, how far the first row's cells (a ledger's, or a play's on a game's
// page) and the page's height moved when the real faces took over from the fallbacks, and the
// layout shift in the frames after they arrived.
//
// The bar is Agate's. Until Newsreader and IBM Plex Sans Condensed arrive a page is drawn in the
// local faces of `packages/ui/src/font-fallbacks.css`, each resized to the face it stands for.
// They are not letter for letter as wide, so a held-back load does move a little: a word, and
// whatever is set beside it. What it must not do is move the page. So it exits 1 when:
// - a font comes from another origin, or a font the page needs at once is not preloaded (the
//   serif's italic is the pick line's alone and is fetched when first used, on purpose);
// - the layout shift in the frames after the faces arrive is over SWAP_CLS (0.05, half of what
//   Core Web Vitals calls good for a whole page; the worst measured in #168 was 0.021);
// - anything measured moved more than SWAP_PX (32px; the worst measured in #168 was 24px, a
//   ledger cell on the player's page);
// - there was nothing to measure.
// Run on #183 it exits 0: no load shifts more than 0.006 at the swap or moves more than 16px.
// (From #223 to #225 a team's page at 390 moved 35px: its headline wrapped in Newsreader and not
// in the fallback. A club's name no longer wraps; `scripts/headline-lines.mjs` checks all 32.)
// Before #183 Home at 390 shifted 0.054 and grew 104px, and the game page at 390 moved 66px.
// That was this Linux machine's unsized Liberation faces: vinext's fallback, one regular cut
// over `local("Arial")` and `local("Times New Roman")`, found no face here and never applied.
//
// The browser is launched with `--font-render-hinting=none`, which Ryan accepted in #183.
// Headless Chromium on Linux otherwise rounds each letter's advance to a whole pixel, so a face's
// width to the em changes with the type size (the same bold Plex line is 34.7 units to the em at
// 15px and 32.4 at 30px) and no fallback can follow it. iOS, Android and macOS do not hint that
// way, and the bar exists for phones. What that leaves out, plainly:
// - with hinting on, which is desktop Chrome on Linux, three held-back loads still move more
//   than 32px: the player's page at 1440 (37px) and the game page at 390 (62px) and 1440 (65px);
// - no real iOS or Android device has been measured. The phones' numbers come from this desk.
//
// A page shifts for reasons that are not the fonts (a time rewritten in the visitor's zone), so
// the fonts are judged at the swap alone.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [baseURL = "http://localhost:5173", out] = process.argv.slice(2);
const PATHS = [
  "/",
  "/nhl",
  "/nhl/teams/21",
  "/players/4024123",
  "/nhl/games/401803652",
  // A written piece: there once the sample picks and pieces are seeded (`/skeleton/picks`).
  "/pieces/2026-10-06-preview",
  // The Picks page: its figures, tonight's picks and the sample columns, seeded as the piece is.
  "/picks",
];
const WIDTHS = { 390: 844, 1440: 900 };
const HOLD_MS = 2000;
const SWAP_CLS = 0.05;
const SWAP_PX = 32;
/**
 * The files of the page's italic faces, as its own `@font-face` rules name them. The pick line's
 * italic is not preloaded, by design (`apps/web/src/head.ts`), and its file's hashed name does
 * not say what it is: the rule's `font-style` does.
 */
const italicFiles = () => {
  const files = [];
  const read = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) read(rule.cssRules);
      if (rule.constructor.name !== "CSSFontFaceRule") continue;
      if (!/italic|oblique/.test(rule.style.getPropertyValue("font-style"))) continue;
      const base = rule.parentStyleSheet?.href ?? document.baseURI;
      for (const [, , file] of rule.style
        .getPropertyValue("src")
        .matchAll(/url\((["']?)([^"')]+)\1\)/g)) {
        files.push(new URL(file, base).href);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      read(sheet.cssRules);
    } catch {
      // Another origin's sheet cannot be read, and has none of the site's faces.
    }
  }
  return files;
};

/**
 * Where the first ledger row's cells and the page's own blocks are, and the size of the page:
 * what a font swap could move. A page with no ledger (a game's) still has its blocks.
 */
const geometry = () => {
  const cells = [
    ...(document.querySelector('[data-slot="ledger-row"]')?.children ?? []),
    ...document.querySelectorAll("main > *, main > * > *"),
  ];
  return {
    height: document.documentElement.scrollHeight,
    cells: cells.map((cell) => {
      const { x, y, width } = cell.getBoundingClientRect();
      return [x, y, width].map((value) => Math.round(value * 10) / 10);
    }),
  };
};

// Letters at their designed widths (#183; the header says why and what it leaves unmeasured).
const browser = await chromium.launch({ args: ["--font-render-hinting=none"] });
const results = [];

for (const path of PATHS) {
  for (const [width, height] of Object.entries(WIDTHS)) {
    for (const held of [false, true]) {
      const context = await browser.newContext({ viewport: { width: Number(width), height } });
      const page = await context.newPage();
      const fonts = [];
      page.on("request", (request) => {
        if (request.resourceType() === "font") fonts.push(request.url());
      });
      if (held) {
        await page.route(/\.woff2$/, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
          await route.continue();
        });
      }
      await page.addInitScript(() => {
        window.__cls = 0;
        window.__shifts = [];
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            window.__cls += entry.value;
            window.__shifts.push([entry.startTime, entry.value]);
          }
        }).observe({ type: "layout-shift", buffered: true });
        // A shift from the moment the first font file arrived is the swap's. Not `loadingdone`:
        // that waits for the last of the files, and the first has redrawn the page by then. The
        // 50ms is slack between the two clocks: a shift is stamped with its frame's start.
        window.__atSwap = () => {
          const arrived = performance
            .getEntriesByType("resource")
            .filter((entry) => /\.woff2(\?|$)/.test(entry.name))
            .map((entry) => entry.responseEnd);
          if (arrived.length === 0) return 0;
          const first = Math.min(...arrived);
          return window.__shifts
            .filter(([at]) => at >= first - 50)
            .reduce((sum, [, value]) => sum + value, 0);
        };
      });
      await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded" });
      let before = null;
      if (held) {
        await page.waitForTimeout(HOLD_MS / 2);
        before = await page.evaluate(geometry);
        before.loaded = await page.evaluate(() =>
          document.fonts.check('13px "IBM Plex Sans Condensed"'),
        );
      }
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const after = await page.evaluate(geometry);
      const head = await page.evaluate(() => ({
        preload: [...document.querySelectorAll('link[rel="preload"][as="font"]')].map((link) =>
          link.getAttribute("href"),
        ),
        display: [...document.fonts]
          .map((face) => face.display)
          .filter((value, at, all) => all.indexOf(value) === at),
        cls: Math.round(window.__cls * 100000) / 100000,
        atSwap: Math.round(window.__atSwap() * 100000) / 100000,
      }));
      const moved =
        before == null
          ? null
          : Math.max(
              Math.abs(after.height - before.height),
              ...after.cells.flatMap((cell, at) =>
                cell.map((value, part) => Math.abs(value - (before.cells[at]?.[part] ?? value))),
              ),
            );
      const italic = await page.evaluate(italicFiles);
      const lazy = (url) => italic.includes(url);
      const failed = [];
      if (held && head.atSwap > SWAP_CLS) failed.push(`${head.atSwap} of layout shift at the swap`);

      if (moved != null && moved > SWAP_PX) failed.push(`moved ${moved}px at the swap`);
      if (fonts.some((url) => !url.startsWith(baseURL))) failed.push("font from another origin");
      if (fonts.length === 0) failed.push("no font requested");
      if (!fonts.every((url) => lazy(url) || head.preload.some((href) => url.endsWith(href))))
        failed.push("font not preloaded");
      if (before?.loaded) failed.push("the held-back font had already loaded");
      // A ledger that had not been drawn when the font was still held back measured nothing.
      if (
        before != null &&
        (before.cells.length === 0 || before.cells.length !== after.cells.length)
      ) {
        failed.push("what was measured before the swap is not what was there after it");
      }
      results.push({
        path,
        width: Number(width),
        fontHeldBackMs: held ? HOLD_MS : 0,
        cls: head.cls,
        clsAtSwap: held ? head.atSwap : null,
        fontFiles: fonts.map((url) => url.replace(baseURL, "")),
        preloaded: head.preload,
        fontDisplay: head.display,
        movedAtSwapPx: moved,
        failed,
      });
      await context.close();
    }
  }
}
await browser.close();

if (out)
  await writeFile(
    out,
    `${JSON.stringify({ baseURL, measuredAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
for (const result of results) {
  console.log(
    `${result.path} ${result.width} held ${result.fontHeldBackMs}ms: CLS ${result.cls}${result.clsAtSwap == null ? "" : ` (${result.clsAtSwap} at the swap)`}, moved ${result.movedAtSwapPx ?? "-"}px, ${result.fontFiles.length} font file(s)${result.failed.length ? ` FAILED ${result.failed.join("; ")}` : ""}`,
  );
}
process.exit(results.some((result) => result.failed.length > 0) ? 1 : 0);
