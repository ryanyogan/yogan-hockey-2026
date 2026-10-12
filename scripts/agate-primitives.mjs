// Measures the shared primitives against their equivalents in the Agate prototype, and shoots the
// routes that show them: an agate table's column head, row and rule against a `Ledger`'s, a red
// label against a `SectionHeader`, the serif title against a `PageHeader`, the phone's conference
// control against `UrlTabs`, and a mark against a `Badge`.
//
//   PORT=5129 pnpm prototype:agate        ESPN_FIXTURES=1 PORT=<B> pnpm dev
//   node scripts/agate-primitives.mjs http://localhost:5129 http://localhost:<B> [outDir]
//
// It prints every style that differs, at 390px and at 1440px, in both themes, and exits 1 when
// one does that is not listed in KNOWN with its reason. With an outDir it also writes the shots
// and `measurements.json`.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { TEAM } from "./look-routes.mjs";

const [prototype = "http://localhost:5129", site = "http://localhost:5173", outDir] =
  process.argv.slice(2);

const WIDTHS = { 390: 844, 1440: 900 };
const THEMES = ["light", "dark"];
const SHOTS = [
  { name: "standings", path: "/nhl" },
  { name: "teams", path: "/nhl?tab=teams" },
  { name: "team", path: `/nhl/teams/${TEAM}` },
  { name: "players", path: "/players" },
  { name: "sample", path: "/skeleton" },
];

const TYPE = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing"];
const CAPS = [...TYPE, "textTransform", "color"];
const RULE = ["borderBottomWidth", "borderBottomStyle", "borderBottomColor"];
const RULE_ABOVE = ["borderTopWidth", "borderTopStyle", "borderTopColor"];
const PAD = ["paddingTop", "paddingBottom"];

/**
 * Each thing measured: where it is in the prototype, where on the site (a path and a selector),
 * and the styles that have to be the same. `phone` or `desk` keeps a part to the one width.
 */
const PARTS = [
  {
    name: "column head",
    prototype: ".conf .agate thead th:nth-child(2)",
    site: ["/nhl", 'th[data-slot="ledger-column"]:nth-of-type(4)'],
    styles: [...CAPS, ...PAD, ...RULE, "textAlign"],
  },
  {
    name: "row cell (a number)",
    prototype: ".conf .agate tbody td:nth-child(3)",
    site: ["/nhl", '[data-slot="ledger-body"] tr:first-child td:nth-of-type(4)'],
    styles: [...TYPE, ...PAD, "textAlign", "fontVariantNumeric", "color"],
  },
  {
    name: "row rule",
    prototype: ".conf .agate tbody tr:first-child td:nth-child(3)",
    // The site rules the row; the prototype each of its cells.
    site: ["/nhl", '[data-slot="ledger-body"] tr:first-child'],
    styles: RULE,
  },
  {
    name: "row height",
    prototype: ".conf .agate tbody tr:first-child",
    site: ["/nhl", '[data-slot="ledger-body"] tr:first-child'],
    styles: ["height"],
  },
  {
    name: "key number",
    prototype: ".conf .agate tbody td.strong",
    site: ["/nhl", '[data-slot="ledger-body"] td[data-tone="strong"]'],
    styles: [...TYPE, "textAlign"],
  },
  {
    name: "row under the pointer",
    prototype: ".conf .agate tbody tr:first-child td:nth-child(3)",
    site: ["/nhl", '[data-slot="ledger-body"] tr:first-child'],
    styles: ["backgroundColor"],
    hover: [".conf .agate tbody tr:first-child", '[data-slot="ledger-body"] tr:first-child'],
    desk: true,
  },
  {
    name: "section label",
    prototype: ".briefs > .label, .favorites__head .label",
    site: ["/nhl", '[data-slot="section-header"] h2'],
    styles: CAPS,
  },
  {
    name: "section label's rule",
    prototype: ".glance h2, .briefs > .label",
    site: ["/nhl", '[data-slot="section-header"]'],
    styles: [...RULE, "paddingBottom"],
  },
  {
    name: "page title",
    prototype: ".band-title",
    site: ["/skeleton", '[data-slot="page-header"] h1'],
    styles: TYPE,
  },
  {
    // The heavy rule is above the title: the lower band's at a desk, the standings' on a phone.
    name: "page title's rule",
    prototype: ".lower",
    site: ["/skeleton", '[data-slot="page-header"]'],
    styles: [...RULE_ABOVE, "paddingTop", "borderBottomWidth"],
    desk: true,
  },
  {
    name: "page title's rule",
    prototype: ".standings",
    site: ["/skeleton", '[data-slot="page-header"]'],
    styles: [...RULE_ABOVE, "paddingTop", "borderBottomWidth"],
    phone: true,
  },
  {
    name: "tab",
    prototype: '.conf-tabs button[aria-pressed="false"]',
    site: ["/nhl", '[data-slot="url-tabs"] a:not([aria-current])'],
    styles: [...CAPS, "height", "backgroundColor"],
    phone: true,
  },
  {
    name: "current tab",
    prototype: '.conf-tabs button[aria-pressed="true"]',
    site: ["/nhl", '[data-slot="url-tabs"] a[aria-current="page"]'],
    styles: [...CAPS, "height", "backgroundColor"],
    phone: true,
  },
  {
    name: "tabs' frame",
    prototype: ".conf-tabs",
    site: ["/nhl", '[data-slot="url-tabs"]'],
    styles: [...RULE, "borderTopWidth", "borderLeftWidth", "width"],
    phone: true,
  },
  {
    name: "second tab's rule",
    prototype: ".conf-tabs button + button",
    site: ["/nhl", '[data-slot="url-tabs"] a + a'],
    styles: ["borderLeftWidth", "borderLeftStyle", "borderLeftColor"],
    phone: true,
  },
  {
    name: "mark (outlined)",
    prototype: ".mark--wrong",
    site: ["/skeleton", '[data-testid="marks"] [data-slot="badge"]:nth-of-type(2)'],
    styles: [...CAPS, ...PAD, "paddingLeft", "paddingRight", "height", "backgroundColor"],
    extra: ["borderTopWidth", "borderTopStyle", "borderTopColor"],
  },
  {
    name: "mark (filled)",
    prototype: ".mark--right",
    site: ["/skeleton", '[data-testid="marks"] [data-slot="badge"]:nth-of-type(1)'],
    styles: [...CAPS, "height", "backgroundColor"],
    extra: ["borderTopColor"],
  },
];

/** A difference that is meant, by part and style, with why. It is printed and does not fail. */
const KNOWN = {
  "row height|height|390":
    "A row is 44px on a phone, a thumb's height: it is a link, or has one in a cell. The prototype's rows are not links. Its line and its padding are the prototype's.",
  "column head|borderBottomColor|390":
    "The prototype's phone has no label over its one table, so the column heads carry the ink rule. A Ledger sits under a SectionHeader, which carries it at every width.",
};

/** Runs in the page: the computed styles of the first element matching, or null. */
const read = ([selector, styles]) => {
  const node = document.querySelector(selector);
  if (!node) return null;
  const computed = getComputedStyle(node);
  const box = node.getBoundingClientRect();
  return Object.fromEntries(
    styles.map((style) => [
      style,
      style === "height" || style === "width"
        ? `${Math.round(box[style] * 100) / 100}px`
        : style === "fontFamily"
          ? // Fontsource names the variable file's family "Newsreader Variable": the same face.
            computed.fontFamily
              .split(",")[0]
              .replaceAll('"', "")
              .trim()
              .replace(/ Variable$/, "")
          : style === "lineHeight"
            ? `${Math.round(Number.parseFloat(computed.lineHeight) * 100) / 100}px`
            : computed[style],
    ]),
  );
};

const browser = await chromium.launch();
const measurements = [];
let failures = 0;
if (outDir) await mkdir(outDir, { recursive: true });

for (const [width, height] of Object.entries(WIDTHS)) {
  for (const theme of THEMES) {
    const context = await browser.newContext({
      viewport: { width: Number(width), height },
      colorScheme: theme,
    });
    const page = await context.newPage();
    const open = async (url) => {
      if (page.url() !== url) await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
    };
    for (const part of PARTS) {
      if ((part.phone && width !== "390") || (part.desk && width !== "1440")) continue;
      const styles = [...part.styles, ...(part.extra ?? [])];
      await open(`${prototype}/?slate=tonight&theme=${theme}&chrome=0`);
      if (part.hover) await page.hover(part.hover[0]);
      const wanted = await page.evaluate(read, [part.prototype, styles]);
      await open(`${site}${part.site[0]}`);
      if (part.hover) await page.hover(part.hover[1]);
      const drawn = await page.evaluate(read, [part.site[1], styles]);
      if (!wanted || !drawn) {
        console.log(
          `${width} ${theme}  ${part.name}: not found (${wanted ? "site" : "prototype"})`,
        );
        failures += 1;
        continue;
      }
      const differences = styles.filter((style) => wanted[style] !== drawn[style]);
      measurements.push({ width, theme, part: part.name, prototype: wanted, site: drawn });
      for (const style of differences) {
        const reason = KNOWN[`${part.name}|${style}|${width}`];
        if (reason == null) failures += 1;
        console.log(
          `${width} ${theme}  ${part.name}: ${style} ${wanted[style]} -> ${drawn[style]}${reason ? `  (known: ${reason})` : ""}`,
        );
      }
    }
    if (outDir) {
      for (const shot of SHOTS) {
        await open(`${site}${shot.path}`);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (overflow > 0) {
          console.log(`${width} ${theme}  ${shot.name}: scrolls sideways by ${overflow}px`);
          failures += 1;
        }
        await page.screenshot({
          path: `${outDir}/${shot.name}-${width}-${theme}.png`,
          fullPage: true,
        });
      }
    }
    await context.close();
  }
}
await browser.close();
if (outDir) await writeFile(`${outDir}/measurements.json`, JSON.stringify(measurements, null, 2));
console.log(
  failures === 0
    ? `The primitives match the prototype (${measurements.length} measurements).`
    : `${failures} differences.`,
);
process.exit(failures === 0 ? 0 : 1);
