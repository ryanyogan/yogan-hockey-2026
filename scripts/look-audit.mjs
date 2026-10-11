// Audits every route at 390px and 1440px in light and dark for what "rules that meet and uniform
// padding" (#140) asks, so that it is measured and not a matter of taste:
//
//   overflow  the document is no wider than the window;
//   rules     every drawn rule (a border, or a filled box a pixel or two thick) ends, within half
//             a pixel, on a rule it meets, on the edge of the page, or on the edge of the column
//             it is drawn in (tables are not boxed: docs/design/tuned-ledger.md);
//   spacing   every padding, margin and gap is a value of the one spacing scale, or is named in
//             ALLOWED below with its reason;
//   shift     the layout shift of a cold load, with favorites in the browser and with none.
//
//   node scripts/look-audit.mjs [baseURL] [outDir] [name-prefix]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes). It
// writes audit.json (every finding) and audit.md (the table and the distinct findings), and exits
// 1 when any page has a finding or shifts.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import {
  PLAYER,
  ROUTES,
  removeDevOverlay,
  seedPicks,
  TEAM,
  THEMES,
  WIDTHS,
} from "./look-routes.mjs";

const [baseURL = "http://localhost:5173", outDir = "docs/design/rules-and-padding", only] =
  process.argv.slice(2);
await mkdir(outDir, { recursive: true });

/** The one spacing scale (packages/ui/src/theme.css). */
const SCALE = [0, 4, 8, 12, 16, 24, 32, 48];

/**
 * Spacing that is not on the scale and is meant. Each entry: the properties, the value in px (a
 * number, or the name of a custom property on <html> that holds it), a selector the element must
 * match, and why.
 */
const ALLOWED = [
  {
    properties: ["padding-top", "padding-bottom"],
    value: "--row-pad",
    selector: "*",
    why: "`py-row`, a row's own padding: 6px (11px on a phone) around a 20px (22px) line makes the approved prototype's 33px and 45px rows, in a ledger and in whatever is drawn as one of its rows (a play, the line of an empty ledger, the search box).",
  },
  {
    properties: ["margin-right"],
    value: "em",
    selector: '[data-slot="team-mark"], [data-slot="live-marker"], [data-slot="live-marker"] *',
    why: "A team's mark and the live dot stand in a line of text, so the space after each is the prototype's part of that text's size (0.45em and 0.6em), as a word space is.",
  },
  {
    properties: ["padding-top", "padding-bottom"],
    value: 1,
    selector: '[data-slot="badge"]',
    why: "A badge is a 16px line, 1px of padding and its 1px border above and below: the 20px of the line of text it sits in.",
  },
  {
    properties: ["margin-top", "margin-bottom", "margin-left", "margin-right"],
    value: 1,
    selector: "*",
    why: "A 1px negative margin laps one rule over the next so that two do not double.",
  },
];

/**
 * Not audited: the rink and what is drawn on it are #141 to #143's, the caption under it with
 * them (and its placeholder, which repeats it).
 */
const NOT_AUDITED = '[data-slot="rink"], [data-slot="rink-overlay"], [data-slot^="rink-caption"]';

/** A layout shift under this prints as 0.000: the browser reports 0.00008 for a clock changing width (docs/performance/baseline.md). */
const SHIFT_ZERO = 0.0005;

/** Records every layout shift from the first byte, with what moved, before the page can change. */
const watchShifts = () => {
  window.__shifts = [];
  const describe = (node) => {
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    if (!element) return "(gone)";
    const slot = element.closest("[data-slot]")?.getAttribute("data-slot");
    return `${element.tagName.toLowerCase()}${slot ? `[${slot}]` : ""} "${(element.textContent ?? "").trim().slice(0, 40)}"`;
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__shifts.push({
        value: entry.value,
        at: Math.round(entry.startTime),
        moved: entry.sources.slice(0, 3).map((source) => ({
          what: describe(source.node),
          from: [source.previousRect.x, source.previousRect.y, source.previousRect.height],
          to: [source.currentRect.x, source.currentRect.y, source.currentRect.height],
        })),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
};

/** Runs in the page: overflow, the rules and where each ends, and every spacing value. */
const measure = ([scale, allowed, notAudited]) => {
  const EPSILON = 0.5;
  const round = (value) => Math.round(value * 100) / 100;
  const pageWidth = document.documentElement.clientWidth;
  const pageHeight = document.documentElement.scrollHeight;
  const root = getComputedStyle(document.documentElement);

  const describe = (element) => {
    const slots = [];
    for (let at = element; at && slots.length < 3; at = at.parentElement) {
      const slot = at.getAttribute?.("data-slot");
      if (slot) slots.unshift(slot);
      else if (["MAIN", "FOOTER", "HEADER", "ASIDE", "NAV"].includes(at.tagName))
        slots.unshift(at.tagName.toLowerCase());
    }
    const classes = (element.getAttribute("class") ?? "").slice(0, 70);
    return `${slots.join(" > ") || "(shell)"} | <${element.tagName.toLowerCase()}> ${classes}`;
  };

  const drawn = (element) => {
    if (element.closest(`svg, script, style, template, [hidden], ${notAudited}`)) return false;
    if (element.getClientRects().length === 0) return false;
    const style = getComputedStyle(element);
    if (style.visibility !== "visible") return false;
    // Text for a screen reader only: clipped to nothing.
    if (style.clipPath !== "none" || (style.position === "absolute" && style.clip !== "auto"))
      return false;
    return true;
  };
  const opaque = (colour) => {
    const parts = colour.match(/[\d.]+/g)?.map(Number) ?? [];
    return parts.length < 4 || parts[3] > 0;
  };

  /** The box an ancestor that clips lets through, and the edges of the columns an element is in. */
  const context = (element) => {
    let clip = { x1: -Infinity, x2: Infinity, y1: -Infinity, y2: Infinity };
    const columns = new Set();
    // The element itself may be the cell of a grid (a play's row); only its ancestors clip it.
    for (let at = element; at && at !== document.body; at = at.parentElement) {
      const style = getComputedStyle(at);
      const box = at.getBoundingClientRect();
      const inner = {
        x1: box.left + at.clientLeft + scrollX,
        x2: box.left + at.clientLeft + at.clientWidth + scrollX,
        y1: box.top + at.clientTop + scrollY,
        y2: box.top + at.clientTop + at.clientHeight + scrollY,
      };
      const clipsX = at !== element && style.overflowX !== "visible";
      const clipsY = at !== element && style.overflowY !== "visible";
      if (clipsX) {
        clip = { ...clip, x1: Math.max(clip.x1, inner.x1), x2: Math.min(clip.x2, inner.x2) };
      }
      if (clipsY) {
        clip = { ...clip, y1: Math.max(clip.y1, inner.y1), y2: Math.min(clip.y2, inner.y2) };
      }
      // A column: the page's own, the shell's parts, and a cell of a grid or of a row of boxes.
      const parent = at.parentElement ? getComputedStyle(at.parentElement) : null;
      const cellOfGrid = parent?.display.includes("grid");
      const cellOfRow = parent?.display.includes("flex") && parent.flexDirection.startsWith("row");
      if (["MAIN", "FOOTER", "HEADER", "ASIDE"].includes(at.tagName) || cellOfGrid || cellOfRow) {
        // A column is as wide as what it holds: inside its padding. The cell that draws the rule
        // is the column itself, edge to edge.
        const own = at === element;
        columns.add(round(own ? box.left + scrollX : inner.x1 + parseFloat(style.paddingLeft)));
        columns.add(round(own ? box.right + scrollX : inner.x2 - parseFloat(style.paddingRight)));
      }
    }
    return { clip, columns: [...columns] };
  };

  // 1. Every rule, as a box in the document's coordinates.
  const rules = [];
  const unmeasured = new Map();
  for (const element of document.body.querySelectorAll("*")) {
    if (!drawn(element)) continue;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const [left, right, top, bottom] = [
      box.left + scrollX,
      box.right + scrollX,
      box.top + scrollY,
      box.bottom + scrollY,
    ];
    const sides = [];
    for (const [side, across] of [
      ["Top", true],
      ["Bottom", true],
      ["Left", false],
      ["Right", false],
    ]) {
      const width = parseFloat(style[`border${side}Width`]);
      if (!(width > 0) || ["none", "hidden"].includes(style[`border${side}Style`])) continue;
      if (!opaque(style[`border${side}Color`])) continue;
      const rect =
        side === "Top"
          ? { x1: left, x2: right, y1: top, y2: top + width }
          : side === "Bottom"
            ? { x1: left, x2: right, y1: bottom - width, y2: bottom }
            : side === "Left"
              ? { x1: left, x2: left + width, y1: top, y2: bottom }
              : { x1: right - width, x2: right, y1: top, y2: bottom };
      sides.push({ ...rect, across, colour: style[`border${side}Color`], thick: width });
    }
    // A filled box a pixel or two thick is a rule too.
    const thin = Math.min(box.width, box.height);
    if (
      sides.length === 0 &&
      thin > 0 &&
      thin <= 2 &&
      Math.max(box.width, box.height) >= 8 &&
      opaque(style.backgroundColor) &&
      style.backgroundColor !== "rgba(0, 0, 0, 0)"
    ) {
      sides.push({
        x1: left,
        x2: right,
        y1: top,
        y2: bottom,
        across: box.width > box.height,
        colour: style.backgroundColor,
        thick: thin,
      });
    }
    // A rule drawn by ::before or ::after has no box to measure: it is listed for the eye.
    for (const pseudo of ["::before", "::after"]) {
      const of = getComputedStyle(element, pseudo);
      if (of.content === "none" || of.content === "normal") continue;
      const bordered = ["Top", "Bottom", "Left", "Right"].some(
        (side) => parseFloat(of[`border${side}Width`]) > 0 && of[`border${side}Style`] !== "none",
      );
      if (bordered) {
        const key = `${describe(element)} ${pseudo}`;
        unmeasured.set(key, (unmeasured.get(key) ?? 0) + 1);
      }
    }
    // A box under 8px each way with borders is a drawn glyph (the ticker's triangle), not a rule.
    if (sides.length === 0 || Math.max(box.width, box.height) < 12) continue;
    const { clip, columns } = context(element);
    for (const side of sides) {
      const clipped = {
        ...side,
        x1: Math.max(side.x1, clip.x1),
        x2: Math.min(side.x2, clip.x2),
        y1: Math.max(side.y1, clip.y1),
        y2: Math.min(side.y2, clip.y2),
      };
      if (clipped.x2 - clipped.x1 <= 0 || clipped.y2 - clipped.y1 <= 0) continue;
      // Where a clip cut the rule, the edge of what clipped it is where it ends.
      const edges = new Set(columns);
      if (clipped.x1 !== side.x1) edges.add(round(clipped.x1));
      if (clipped.x2 !== side.x2) edges.add(round(clipped.x2));
      rules.push({ ...clipped, edges: [...edges], from: describe(element) });
    }
  }

  // 2. Lengths of one rule drawn by neighbours (the cells of a header row) are one rule.
  const merged = [];
  const key = (rule) =>
    rule.across
      ? `h ${Math.round(rule.y1 * 2)} ${rule.thick} ${rule.colour}`
      : `v ${Math.round(rule.x1 * 2)} ${rule.thick} ${rule.colour}`;
  const groups = new Map();
  for (const rule of rules) groups.set(key(rule), [...(groups.get(key(rule)) ?? []), rule]);
  for (const group of groups.values()) {
    const [start, end] = group[0].across ? ["x1", "x2"] : ["y1", "y2"];
    group.sort((a, b) => a[start] - b[start]);
    let current = null;
    for (const rule of group) {
      if (current && rule[start] <= current[end] + EPSILON) {
        current[end] = Math.max(current[end], rule[end]);
        current.edges = [...new Set([...current.edges, ...rule.edges])];
      } else {
        current = { ...rule };
        merged.push(current);
      }
    }
  }

  // 3. Each end of each rule meets something, or is a finding.
  const touches = (a, b) =>
    a.x1 <= b.x2 + EPSILON &&
    a.x2 >= b.x1 - EPSILON &&
    a.y1 <= b.y2 + EPSILON &&
    a.y2 >= b.y1 - EPSILON;
  const near = (a, b) => Math.abs(a - b) <= EPSILON;
  const ruleFindings = [];
  for (const rule of merged) {
    const [start, end, cross1, cross2] = rule.across
      ? ["x1", "x2", "y1", "y2"]
      : ["y1", "y2", "x1", "x2"];
    const limit = rule.across ? pageWidth : pageHeight;
    for (const which of [start, end]) {
      const at = rule[which];
      if (near(at, 0) || near(at, limit)) continue;
      // The end, as a box of no length.
      const cap = { ...rule, [start]: at, [end]: at };
      const others = merged.filter((other) => other !== rule);
      if (others.some((other) => touches(cap, other))) continue;
      // Only a rule that runs across the page ends at a column's edge; one that runs down it
      // must meet a rule or the page's edge.
      if (rule.across && rule.edges.some((edge) => near(edge, at))) continue;
      // What it missed: a rule running the other way, alongside this end and within 24px of it.
      const missed = others
        .filter(
          (other) =>
            other.across !== rule.across &&
            other[cross1 === "y1" ? "y1" : "x1"] <= rule[cross2] + EPSILON &&
            other[cross1 === "y1" ? "y2" : "x2"] >= rule[cross1] - EPSILON,
        )
        .map((other) => {
          const line = other[start];
          const beyond = which === start ? line - at : at - line - other.thick;
          return { other, beyond };
        })
        .filter(({ beyond }) => Math.abs(beyond) <= 24)
        .sort((a, b) => Math.abs(a.beyond) - Math.abs(b.beyond))[0];
      const side = rule.across
        ? which === start
          ? "left"
          : "right"
        : which === start
          ? "top"
          : "bottom";
      ruleFindings.push({
        rule: rule.from,
        end: side,
        at: round(at),
        fault: missed
          ? `${missed.beyond > 0 ? "overshoots" : "stops short of"} the rule of ${missed.other.from} by ${round(Math.abs(missed.beyond))}px`
          : `ends at nothing (${rule.across ? "column edges" : "no rule"} ${rule.across ? rule.edges.join(", ") : ""})`,
      });
    }
  }

  // 4. Every padding, margin and gap.
  // A number of px, a custom property of <html> that holds one, or "em": set in the text's size.
  const isAllowed = (entry, element, property, size) => {
    if (!entry.properties.includes(property) || !element.matches(entry.selector)) return false;
    if (entry.value === "em") return true;
    const value =
      typeof entry.value === "number"
        ? entry.value
        : parseFloat(root.getPropertyValue(entry.value));
    return Math.abs(value - size) < 0.01;
  };
  const spacing = [];
  const properties = [
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "row-gap",
    "column-gap",
  ];
  for (const element of document.body.querySelectorAll("*")) {
    if (!drawn(element)) continue;
    const map = element.computedStyleMap();
    const resolved = getComputedStyle(element);
    for (const property of properties) {
      const value = map.get(property);
      // `auto` and `normal` are not lengths; a percentage follows its container.
      if (value instanceof CSSKeywordValue) continue;
      if (value instanceof CSSUnitValue && value.unit === "percent") continue;
      const px =
        value instanceof CSSUnitValue && value.unit === "px"
          ? value.value
          : parseFloat(resolved.getPropertyValue(property));
      if (Number.isNaN(px)) continue;
      const size = Math.abs(px);
      if (scale.some((step) => Math.abs(step - size) < 0.01)) continue;
      if (allowed.some((entry) => isAllowed(entry, element, property, size))) continue;
      spacing.push({ element: describe(element), property, value: round(px) });
    }
  }

  return {
    theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
    overflow: document.documentElement.scrollWidth - innerWidth,
    rulesMeasured: merged.length,
    rules: ruleFindings,
    unmeasured: [...unmeasured].map(([rule, count]) => ({ rule, count })),
    spacing,
  };
};

async function load(browser, route, width, height, theme, favorites) {
  const context = await browser.newContext({
    viewport: { width: Number(width), height },
    deviceScaleFactor: width === "390" ? 2 : 1,
    hasTouch: width === "390",
    timezoneId: "America/Chicago",
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    ([chosen, team, player, withFavorites]) => {
      localStorage.setItem("theme", chosen);
      if (withFavorites) {
        localStorage.setItem("favorite_teams", JSON.stringify([team]));
        localStorage.setItem("favorite_players", JSON.stringify([player]));
      }
    },
    [theme, TEAM, PLAYER, favorites],
  );
  await context.addInitScript(watchShifts);
  const page = await context.newPage();
  await page.goto(`${baseURL}${route.path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (route.waitFor && favorites) await page.locator(route.waitFor).first().waitFor();
  await page
    .waitForFunction(() => window.__NEXT_HYDRATED === true, null, { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
  if (route.overlay) await removeDevOverlay(page);
  return { context, page };
}

const shiftOf = async (page) => {
  const shifts = await page.evaluate(() => window.__shifts);
  const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
  return { total: Number(total.toFixed(4)), shifts };
};

const browser = await chromium.launch();
await seedPicks(browser, baseURL);
const pages = [];
for (const route of ROUTES) {
  if (only && !route.name.startsWith(only)) continue;
  for (const [width, height] of Object.entries(WIDTHS)) {
    for (const theme of THEMES) {
      const first = await load(browser, route, width, height, theme, true);
      const measured = await first.page.evaluate(measure, [SCALE, ALLOWED, NOT_AUDITED]);
      const shift = await shiftOf(first.page);
      await first.context.close();
      const second = await load(browser, route, width, height, theme, false);
      const shiftNoFavorites = await shiftOf(second.page);
      await second.context.close();
      pages.push({
        page: route.name,
        path: route.path,
        width: Number(width),
        ...measured,
        shift,
        shiftNoFavorites,
      });
      if (measured.theme !== theme) throw new Error(`${route.name}: theme is ${measured.theme}`);
    }
  }
}
await browser.close();
if (pages.length === 0) {
  console.log(`no route's name starts with "${only}"`);
  process.exit(1);
}

// The same finding on forty rows of four shots is one finding.
const distinct = (kind, text) => {
  const found = new Map();
  for (const page of pages) {
    for (const finding of page[kind]) {
      const line = text(finding);
      const entry = found.get(line) ?? { count: 0, on: new Set() };
      entry.count += 1;
      entry.on.add(`${page.page}@${page.width}`);
      found.set(line, entry);
    }
  }
  return [...found].map(([line, { count, on }]) => ({ line, count, on: [...on] }));
};
const ruleLines = distinct(
  "rules",
  (finding) => `${finding.rule}: ${finding.end} end ${finding.fault.replace(/\(.*\)/, "").trim()}`,
);
const spacingLines = distinct(
  "spacing",
  (finding) => `${finding.element}: ${finding.property} ${finding.value}px`,
);
const unmeasuredLines = distinct("unmeasured", (finding) => finding.rule);

const shifted = (page) =>
  page.shift.total >= SHIFT_ZERO || page.shiftNoFavorites.total >= SHIFT_ZERO;
const bad = pages.filter(
  (page) => page.overflow > 0 || page.rules.length > 0 || page.spacing.length > 0 || shifted(page),
);

const list = (lines) =>
  lines.length === 0
    ? "None.\n"
    : `${lines
        .map(
          ({ line, count, on }) =>
            `- \`${line}\` (${count}; ${on.slice(0, 6).join(", ")}${on.length > 6 ? ", ..." : ""})`,
        )
        .join("\n")}\n`;
const report = `# Rules and padding audit

\`node scripts/look-audit.mjs\` against ${only ? `the routes named \`${only}*\`` : "every route"} in fixture mode. ${pages.length} pages measured, ${bad.length} with a finding.

Spacing scale: ${SCALE.join(", ")}px. Allowed besides:

${ALLOWED.map((entry) => `- ${entry.properties.join(", ")} of ${typeof entry.value === "number" ? `${entry.value}px` : `\`${entry.value}\``} on \`${entry.selector}\`: ${entry.why}`).join("\n")}

Not audited: \`${NOT_AUDITED}\` (the rink is #141 to #143's).

| Page | Width | Theme | Overflow px | Rules measured | Rule ends astray | Spacing off the scale | Shift on load | Shift, no favorites |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
${pages
  .map(
    (page) =>
      `| ${page.page} | ${page.width} | ${page.theme} | ${page.overflow} | ${page.rulesMeasured} | ${page.rules.length} | ${page.spacing.length} | ${page.shift.total.toFixed(4)} | ${page.shiftNoFavorites.total.toFixed(4)} |`,
  )
  .join("\n")}

## Rule ends astray

${list(ruleLines)}
## Spacing off the scale

${list(spacingLines)}
## Rules drawn by a pseudo-element (not measured: check by eye)

${list(unmeasuredLines)}`;

if (!only) {
  await writeFile(`${outDir}/audit.json`, `${JSON.stringify({ baseURL, pages }, null, 2)}\n`);
  await writeFile(`${outDir}/audit.md`, report);
} else {
  console.log(report);
}
console.log(
  `${pages.length} pages: ${pages.filter((p) => p.overflow > 0).length} overflow, ${ruleLines.length} distinct rule findings, ${spacingLines.length} distinct spacing findings, ${pages.filter(shifted).length} shift`,
);
process.exit(bad.length > 0 ? 1 : 0);
