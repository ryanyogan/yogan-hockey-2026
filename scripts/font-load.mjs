// Measures how the font arrives on a cold load of a production build, for the record beside the
// look's screenshots (docs/design/approved-look).
//
//   ESPN_FIXTURES=1 pnpm build && (cd apps/web && pnpm exec vite preview --port <PORT> --strictPort)
//   node scripts/font-load.mjs [baseURL] [out.json]
//
// Each page is opened in a new browser context (an empty cache) at 390px and 1440px, twice: as
// the network gives it, and with the font file held back two seconds, which is the slow phone.
// It records the cumulative layout shift, whether the font is self-hosted and preloaded, and,
// for the held-back load, how far the first ledger row's cells and the page's height moved when
// the real face took over from the fallback. A page shifts for reasons that are not the font
// (a time rewritten in the visitor's zone, favorites read from the browser), so the font is
// judged by the difference: it exits 1 when holding the font back adds to the layout shift,
// when anything moved at the swap, or when the font comes from another origin or is not
// preloaded.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [baseURL = "http://localhost:5173", out] = process.argv.slice(2);
const PATHS = ["/", "/nhl", "/nhl/teams/21", "/players/4024123", "/nhl/games/401803652"];
const WIDTHS = { 390: 844, 1440: 900 };
const HOLD_MS = 2000;

/** Where the first ledger row's cells are, and the size of the page: what a font swap could move. */
const geometry = () => {
  const cells = [...(document.querySelector('[data-slot="ledger-row"]')?.children ?? [])];
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
const unheld = new Map();
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
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if (!entry.hadRecentInput) window.__cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded" });
      let before = null;
      if (held) {
        await page.waitForTimeout(HOLD_MS / 2);
        before = await page.evaluate(geometry);
        before.loaded = await page.evaluate(() => document.fonts.check('13px "Geist Mono"'));
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
      if (!held) unheld.set(`${path} ${width}`, head.cls);
      const added = held ? head.cls - unheld.get(`${path} ${width}`) : 0;
      if (added > 0.001) failed.push(`the late font added ${added} of layout shift`);
      if (moved != null && moved > 0.5) failed.push(`moved ${moved}px at the swap`);
      if (fonts.some((url) => !url.startsWith(baseURL))) failed.push("font from another origin");
      if (fonts.length === 0) failed.push("no font requested");
      if (!fonts.every((url) => head.preload.some((href) => url.endsWith(href))))
        failed.push("font not preloaded");
      if (before?.loaded) failed.push("the held-back font had already loaded");
      results.push({
        path,
        width: Number(width),
        fontHeldBackMs: held ? HOLD_MS : 0,
        cls: head.cls,
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
