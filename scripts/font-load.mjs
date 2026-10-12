// Measures how the font arrives on a cold load of a production build, for the record beside the
// look's screenshots (docs/design/approved-look).
//
//   ESPN_FIXTURES=1 pnpm build && (cd apps/web && pnpm exec vite preview --port <PORT> --strictPort)
//   node scripts/font-load.mjs [baseURL] [out.json]
//
// Each page is opened in a new browser context (an empty cache) at 390px and 1440px, twice: as
// the network gives it, and with the font file held back two seconds, which is the slow phone.
// It records the cumulative layout shift, whether the font is self-hosted and preloaded, and,
// for the held-back load, how far the first row's cells (a ledger's, or a play's on a game's
// page) and the page's height moved when the real face took over from the fallback, and the
// layout shift in the frames after it arrived. A page shifts for reasons that are not the font
// (a time rewritten in the visitor's zone, favorites read from the browser) and by an amount
// that varies with when the page hydrates, so the font is judged at the swap alone: it exits 1
// when anything moved or shifted there, when there was no row to measure, or when the font
// comes from another origin or is not preloaded.
//
// That bar was Geist Mono's, whose fallback was letter for letter as wide. Since #168 the faces
// are Newsreader and IBM Plex Sans Condensed over resized system fonts, a held-back load does move
// (docs/agents/build-notes.md, "Agate 1"), and so this exits 1: read its numbers, not its status,
// until a later Agate ticket sets a new bar.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [baseURL = "http://localhost:5173", out] = process.argv.slice(2);
const PATHS = ["/", "/nhl", "/nhl/teams/21", "/players/4024123", "/nhl/games/401803652"];
const WIDTHS = { 390: 844, 1440: 900 };
const HOLD_MS = 2000;

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

const browser = await chromium.launch();
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
        window.__atSwap = 0;
        window.__fontAt = null;
        document.fonts.addEventListener("loadingdone", () => {
          window.__fontAt ??= performance.now();
        });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            window.__cls += entry.value;
            // A shift in the frames after the face arrived is the swap's.
            if (window.__fontAt != null && entry.startTime >= window.__fontAt - 50)
              window.__atSwap += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
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
        atSwap: Math.round(window.__atSwap * 100000) / 100000,
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
      const failed = [];
      if (held && head.atSwap > 0.001) failed.push(`${head.atSwap} of layout shift at the swap`);

      if (moved != null && moved > 0.5) failed.push(`moved ${moved}px at the swap`);
      if (fonts.some((url) => !url.startsWith(baseURL))) failed.push("font from another origin");
      if (fonts.length === 0) failed.push("no font requested");
      if (!fonts.every((url) => head.preload.some((href) => url.endsWith(href))))
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
    `${result.path} ${result.width} held ${result.fontHeldBackMs}ms: CLS ${result.cls}, moved ${result.movedAtSwapPx ?? "-"}px, ${result.fontFiles.length} font file(s)${result.failed.length ? ` FAILED ${result.failed.join("; ")}` : ""}`,
  );
}
process.exit(results.some((result) => result.failed.length > 0) ? 1 : 0);
