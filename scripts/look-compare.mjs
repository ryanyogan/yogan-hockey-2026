// Measures the same things on the approved prototype and on the site, side by side: where the
// shell's parts and a page's first ledger sit, and the type they are set in. The fixtures differ
// (the prototype's slate has finals and games in progress), so it compares geometry and type,
// not the words: a part whose width or place depends on what it says is measured for its height
// and type only.
//
//   PORT=<A> pnpm prototype:look        ESPN_FIXTURES=1 PORT=<B> pnpm dev
//   node scripts/look-compare.mjs http://localhost:<A> http://localhost:<B> [out.json]
//
// It exits 1 when a measurement differs by more than half a pixel, or a style differs at all.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [prototype = "http://localhost:5128", site = "http://localhost:5173", out] =
  process.argv.slice(2);

const BOX = ["x", "y", "width", "height"];
const PLACE = ["x", "y", "height"];
/**
 * Each thing measured: its selector in the prototype's markup and in the site's, and which of
 * its measurements do not depend on the words in it.
 */
const PARTS = {
  strip: [".strip", '[data-slot="score-ticker"]', BOX],
  "strip label": [".strip-label", 'nav[aria-label="Scores"] a[href="/nhl/live"]', BOX],
  "strip game": [".strip-game", 'nav[aria-label="Scores"] li a', PLACE],
  main: ["main", "main", ["x", "y", "width"]],
  "section header": [".section-header", '[data-slot="section-header"]', ["x", "y", "width"]],
  "section title": [".section-header h2", '[data-slot="section-header"] h2', PLACE],
  "section count": [".section-header .count", '[data-slot="section-count"]', ["y", "height"]],
  "column header": [".ledger th", 'th[data-slot="ledger-column"]', PLACE],
  "ledger row": [".ledger tbody tr", '[data-slot="ledger-body"] [data-slot="ledger-row"]', BOX],
  "row cell": [".ledger tbody td", '[data-slot="ledger-body"] [data-slot="ledger-cell"]', PLACE],
  "team mark": [
    ".ledger tbody .mark",
    '[data-slot="ledger-body"] [data-slot="team-mark"]',
    ["width", "height"],
  ],
  footer: [".footer", "footer", BOX],
  sidebar: [".sidebar", "aside", BOX],
  "sidebar link": [".sidebar .nav-item", 'aside nav[aria-label="Site"] a', BOX],
  wordmark: [".wordmark", 'a[href="/"].font-strong', BOX],
  tab: [".tabs a", '[data-slot="url-tabs"] a', ["height"]],
  // The game page under its rink, which is not compared: the rink is drawn by other tickets.
  timeline: [".timeline", '[data-slot="period-timeline"]', ["x", "width", "height"]],
  "play row": [".plays .play", '[data-slot="play-row"]', ["x", "width"]],
  "play time": [".plays .play .t", '[data-slot="play-row"] > span', ["x", "width"]],
};
/** The prototype's Home has one favorite player; the site is given one. */
const FAVORITE_PLAYER = "4024123";
const PAGES = [
  // `whole`: both draw the same number of rows, so the footer's place is the page's whole height.
  { name: "home", prototype: "#/home", site: "/", whole: true },
  { name: "standings", prototype: "#/standings", site: "/nhl", whole: true },
  { name: "game", prototype: "#/game", site: "/nhl/games/401803652", whole: false },
];
const STYLES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "color",
  "borderBottomWidth",
  "borderBottomColor",
  "paddingTop",
  "paddingLeft",
];

const measure = ([parts, styles]) => {
  const result = {};
  for (const [name, selector] of parts) {
    const element = [...document.querySelectorAll(selector)].find(
      (candidate) => candidate.getClientRects().length > 0,
    );
    if (element == null) {
      result[name] = null;
      continue;
    }
    const rect = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    // The rule under a row is the row's on the site and its cells' in the prototype: one rule.
    const other =
      element.tagName === "TR"
        ? element.firstElementChild
        : element.tagName === "TD"
          ? element.parentElement
          : null;
    const ruled =
      computed.borderBottomWidth === "0px" && other != null ? getComputedStyle(other) : computed;
    result[name] = {
      x: rect.x,
      y: rect.y + scrollY,
      width: rect.width,
      height: rect.height,
      ...Object.fromEntries(
        styles.map((style) => [
          style,
          (style.startsWith("borderBottom") ? ruled : computed)[style],
        ]),
      ),
    };
  }
  return result;
};

const browser = await chromium.launch();
const rows = [];
for (const target of PAGES) {
  for (const [width, height] of [
    [390, 844],
    [1440, 900],
  ]) {
    for (const theme of ["light", "dark"]) {
      const read = async (which) => {
        const context = await browser.newContext({ viewport: { width, height } });
        await context.addInitScript(
          ([chosen, player]) => {
            localStorage.setItem("theme", chosen);
            localStorage.setItem("favorite_players", JSON.stringify([player]));
          },
          [theme, FAVORITE_PLAYER],
        );
        const page = await context.newPage();
        const url =
          which === "prototype"
            ? `${prototype}/?theme=${theme}&chrome=0${target.prototype}`
            : `${site}${target.site}`;
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        if (which === "site" && target.name === "home") {
          await page.locator('[data-slot="heart-button"]').first().waitFor();
        }
        await page.waitForTimeout(300);
        const parts = Object.entries(PARTS).map(([name, pair]) => [
          name,
          pair[which === "prototype" ? 0 : 1],
        ]);
        const measured = await page.evaluate(measure, [parts, STYLES]);
        await context.close();
        return measured;
      };
      const [wanted, got] = [await read("prototype"), await read("site")];
      for (const name of Object.keys(PARTS)) {
        const [a, b] = [wanted[name], got[name]];
        // Hidden in both, as the sidebar is on a phone.
        if (a == null && b == null) continue;
        if (a == null || b == null) {
          rows.push({
            page: target.name,
            width,
            theme,
            part: name,
            missing: a == null ? "prototype" : "site",
          });
          continue;
        }
        const differs = [];
        for (const key of PARTS[name][2]) {
          if (name === "footer" && key === "y" && !target.whole) continue;
          if (Math.abs(a[key] - b[key]) > 0.5) differs.push(`${key} ${a[key]} -> ${b[key]}`);
        }
        for (const style of STYLES) {
          // The first family is the face; the fallbacks after it are each page's own.
          // A rule that is not drawn has no colour to compare.
          if (style === "borderBottomColor" && a.borderBottomWidth === "0px") continue;
          const same =
            style === "fontFamily"
              ? a[style].split(",")[0].replaceAll('"', "") ===
                b[style].split(",")[0].replaceAll('"', "")
              : a[style] === b[style];
          if (!same) differs.push(`${style} ${a[style]} -> ${b[style]}`);
        }
        rows.push({ page: target.name, width, theme, part: name, prototype: a, site: b, differs });
      }
    }
  }
}
await browser.close();

if (out)
  await writeFile(
    out,
    `${JSON.stringify({ prototype, site, measuredAt: new Date().toISOString(), rows }, null, 2)}\n`,
  );
const bad = rows.filter((row) => row.missing || row.differs.length > 0);
console.log(`${rows.length} measurements, ${bad.length} differ`);
for (const row of bad) {
  console.log(
    `${row.page} ${row.width} ${row.theme} ${row.part}: ${row.missing ? `missing in ${row.missing}` : row.differs.join("; ")}`,
  );
}
process.exit(bad.length > 0 ? 1 : 0);
