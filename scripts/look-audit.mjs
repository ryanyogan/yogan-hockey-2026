// Audits every route at 390px and 1440px in light and dark for what "rules that meet and uniform
// padding" (#140) asks, so that it is measured and not a matter of taste:
//
//   overflow  the document is no wider than the window;
//   rules     every drawn rule (a border, or a filled box a pixel or two thick) ends, within half
//             a pixel, on a rule it meets, on the edge of the page (of the window, for what is
//             fixed to it), or on the edge of the column it is drawn in (tables are not boxed:
//             docs/design/tuned-ledger.md);
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
if (!only) await mkdir(outDir, { recursive: true });

/** The one spacing scale (packages/ui/src/theme.css). */
const SCALE = [0, 4, 8, 12, 16, 24, 32, 48];

/**
 * Spacing that is not on the scale and is meant. Each entry: the properties, the value in px (a
 * signed number, or the name of a custom property on <html> that holds a length), a selector the
 * element must match, and why.
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
    value: -1,
    selector: "*",
    why: "A 1px negative margin laps one rule over the next so that two do not double.",
  },
  {
    properties: ["padding-bottom"],
    value: "--tab-bar",
    selector: "div:has(> main#main-content)",
    why: "The phone's tab bar is fixed over the foot of the window, so the shell is padded by the bar's height (`--tab-bar`: the prototype's 56px, and the home bar's room on a phone that has one) and the footer ends above it.",
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
  const windowHeight = document.documentElement.clientHeight;

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

  /**
   * The edges of the track a cell of a grid stands in, or of the room a row of boxes gives one of
   * its boxes: from the row's edge or the neighbour before it to the neighbour after it or the
   * row's other edge. Not the cell's own box, which a `max-width` can make narrower than its
   * column: a rule on it would then end at nothing and still be at "its column's edge".
   */
  const track = (cell, parent, parentStyle) => {
    const outer = parent.getBoundingClientRect();
    const left = outer.left + parent.clientLeft + parseFloat(parentStyle.paddingLeft);
    const right =
      outer.left + parent.clientLeft + parent.clientWidth - parseFloat(parentStyle.paddingRight);
    const box = cell.getBoundingClientRect();
    const gap = parseFloat(parentStyle.columnGap) || 0;
    if (parentStyle.display.includes("grid")) {
      const widths = parentStyle.gridTemplateColumns
        .replace(/\[[^\]]*\]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .map(parseFloat);
      if (widths.length > 0 && widths.every((width) => !Number.isNaN(width))) {
        const lines = [];
        let at = left;
        for (const width of widths) {
          lines.push([at, at + width]);
          at += width + gap;
        }
        const mine = lines.filter(
          ([x1, x2]) => x2 > box.left + EPSILON && x1 < box.right - EPSILON,
        );
        if (mine.length > 0) return [mine[0][0], mine[mine.length - 1][1]];
      }
    }
    // A row of boxes, or a grid whose tracks could not be read: the neighbours on the same line.
    let [x1, x2] = [left, right];
    for (const other of parent.children) {
      if (other === cell || other.getClientRects().length === 0) continue;
      if (["absolute", "fixed"].includes(getComputedStyle(other).position)) continue;
      const beside = other.getBoundingClientRect();
      if (beside.bottom <= box.top + EPSILON || beside.top >= box.bottom - EPSILON) continue;
      if (beside.right <= box.left + EPSILON) x1 = Math.max(x1, beside.right + gap);
      if (beside.left >= box.right - EPSILON) x2 = Math.min(x2, beside.left - gap);
    }
    return [x1, x2];
  };

  /**
   * Where an element is drawn: the box an ancestor that clips lets through, the edges of the
   * columns it is in, the box fixed to the window that holds it, if one does, and whether it is
   * in a box that sticks to the window.
   */
  const context = (element) => {
    let clip = { x1: -Infinity, x2: Infinity, y1: -Infinity, y2: Infinity };
    const columns = new Set();
    let fixed = null;
    let stuck = false;
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
      const part = ["MAIN", "FOOTER", "HEADER", "ASIDE"].includes(at.tagName);
      if (at === element && (cellOfGrid || cellOfRow)) {
        // The cell that draws the rule: its column is the track it was given.
        const [x1, x2] = track(at, at.parentElement, parent);
        columns.add(round(x1 + scrollX));
        columns.add(round(x2 + scrollX));
      } else if (part || cellOfGrid || cellOfRow) {
        // A column is as wide as what it holds: inside its padding. The part of the shell that
        // draws the rule itself is the column, edge to edge.
        const own = at === element;
        columns.add(round(own ? box.left + scrollX : inner.x1 + parseFloat(style.paddingLeft)));
        columns.add(round(own ? box.right + scrollX : inner.x2 - parseFloat(style.paddingRight)));
      }
      if (style.position === "fixed") {
        fixed = at;
        break;
      }
      if (style.position === "sticky") stuck = true;
    }
    return { clip, columns: [...columns], fixed, stuck };
  };

  // 1. Every rule, as a box in the document's coordinates.
  const rules = [];
  const unmeasured = new Map();
  for (const element of document.body.querySelectorAll("*")) {
    if (!drawn(element)) continue;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const { clip, columns, fixed, stuck } = context(element);
    // What is fixed to the window is measured in the window, where it stays; the rest in the
    // document.
    const [dx, dy] = fixed ? [0, 0] : [scrollX, scrollY];
    const [left, right, top, bottom] = [
      box.left + dx,
      box.right + dx,
      box.top + dy,
      box.bottom + dy,
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
        (side) =>
          parseFloat(of[`border${side}Width`]) > 0 &&
          !["none", "hidden"].includes(of[`border${side}Style`]) &&
          opaque(of[`border${side}Color`]),
      );
      // Its size is known only when it is given one (a positioned or block box).
      const [wide, tall] = [parseFloat(of.width), parseFloat(of.height)];
      const filled =
        Math.min(wide, tall) > 0 &&
        Math.min(wide, tall) <= 2 &&
        Math.max(wide, tall) >= 8 &&
        opaque(of.backgroundColor) &&
        of.backgroundColor !== "rgba(0, 0, 0, 0)";
      if (bordered || filled) {
        const key = `${describe(element)} ${pseudo}`;
        unmeasured.set(key, (unmeasured.get(key) ?? 0) + 1);
      }
    }
    // A box under 12px each way with borders is a drawn glyph (the ticker's triangle), not a rule.
    if (sides.length === 0 || Math.max(box.width, box.height) < 12) continue;
    // The window cuts what is fixed to it as a clipping ancestor would.
    const within = fixed
      ? {
          x1: Math.max(clip.x1, 0),
          x2: Math.min(clip.x2, pageWidth),
          y1: Math.max(clip.y1, 0),
          y2: Math.min(clip.y2, windowHeight),
        }
      : clip;
    for (const side of sides) {
      const clipped = {
        ...side,
        x1: Math.max(side.x1, within.x1),
        x2: Math.min(side.x2, within.x2),
        y1: Math.max(side.y1, within.y1),
        y2: Math.min(side.y2, within.y2),
      };
      if (clipped.x2 - clipped.x1 <= 0 || clipped.y2 - clipped.y1 <= 0) continue;
      // A rule that runs across may end at its column's edge. Where a clip cut a rule, whichever
      // way it runs, the edge of what clipped it is where it ends.
      const [start, end] = side.across ? ["x1", "x2"] : ["y1", "y2"];
      const edges = new Set(side.across ? columns : []);
      if (clipped[start] !== side[start]) edges.add(round(clipped[start]));
      if (clipped[end] !== side[end]) edges.add(round(clipped[end]));
      // What sticks to the window (the sidebar, a screen tall) ends where the window does, as
      // the page under it does not: the window's head and foot are edges for a rule down it.
      if (stuck && !side.across) edges.add(round(scrollY)).add(round(scrollY + windowHeight));
      rules.push({ ...clipped, edges: [...edges], fixed, from: describe(element) });
    }
  }

  // 2. Lengths of one rule drawn by neighbours (the cells of a header row) are one rule.
  const merged = [];
  const key = (rule) =>
    rule.across
      ? `h ${Math.round(rule.y1 * 2)} ${rule.thick} ${rule.colour}`
      : `v ${Math.round(rule.x1 * 2)} ${rule.thick} ${rule.colour}`;
  // What is fixed to the window is its own layer: the page scrolls under it, so a rule of the
  // page that happens to pass under a fixed rule's end does not meet it.
  const layers = new Map();
  for (const rule of rules) {
    const groups = layers.get(rule.fixed) ?? new Map();
    groups.set(key(rule), [...(groups.get(key(rule)) ?? []), rule]);
    layers.set(rule.fixed, groups);
  }
  for (const group of [...layers.values()].flatMap((groups) => [...groups.values()])) {
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
  const near = (a, b) => Math.abs(a - b) <= EPSILON;
  const ruleFindings = [];
  for (const rule of merged) {
    const [start, end, cross1, cross2] = rule.across
      ? ["x1", "x2", "y1", "y2"]
      : ["y1", "y2", "x1", "x2"];
    const limit = rule.across ? pageWidth : rule.fixed ? windowHeight : pageHeight;
    const others = merged.filter((other) => other !== rule && other.fixed === rule.fixed);
    for (const which of [start, end]) {
      const at = rule[which];
      if (near(at, 0) || near(at, limit)) continue;
      // It meets a rule that runs the other way and touches this end, or one that runs the same
      // way through it (the same line, drawn in another colour or weight). A rule alongside, a
      // pixel above or below, is not met.
      const meets = others.some((other) => {
        if (at < other[start] - EPSILON || at > other[end] + EPSILON) return false;
        return other.across !== rule.across
          ? rule[cross1] <= other[cross2] + EPSILON && rule[cross2] >= other[cross1] - EPSILON
          : Math.min(rule[cross2], other[cross2]) - Math.max(rule[cross1], other[cross1]) > 0;
      });
      if (meets) continue;
      // Its column's edge (only for a rule that runs across), or the edge of what clipped it.
      if (rule.edges.some((edge) => near(edge, at))) continue;
      // What it missed: a rule running the other way, alongside this end and within 24px of it.
      const missed = others
        .filter(
          (other) =>
            other.across !== rule.across &&
            other[cross1] <= rule[cross2] + EPSILON &&
            other[cross2] >= rule[cross1] - EPSILON,
        )
        .map((other) => {
          // How far past the other rule's far side this end runs (over), or how far from its
          // near side it stops (short).
          const [near1, far1] =
            which === start ? [other[end], other[start]] : [other[start], other[end]];
          const over = which === start ? far1 - at : at - far1;
          const short = which === start ? at - near1 : near1 - at;
          return { other, over, short, by: over > 0 ? over : short };
        })
        .filter(({ by }) => by <= 24)
        .sort((a, b) => a.by - b.by)[0];
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
          ? `${missed.over > 0 ? "overshoots" : "stops short of"} the rule of ${missed.other.from} by ${round(missed.by)}px`
          : "ends at nothing",
        // The edges it could have ended at.
        edges: rule.edges,
      });
    }
  }

  // 4. Every padding, margin and gap.
  // A signed number of px, a custom property of <html> that holds a length (a `calc()` too, so
  // it is read off a box that is that tall), or "em": set in the text's size.
  const lengths = new Map();
  const lengthOf = (name) => {
    if (!lengths.has(name)) {
      const probe = document.body.appendChild(document.createElement("div"));
      probe.style.cssText = `position:absolute;visibility:hidden;height:var(${name})`;
      lengths.set(name, probe.getBoundingClientRect().height);
      probe.remove();
    }
    return lengths.get(name);
  };
  const isAllowed = (entry, element, property, px) => {
    if (!entry.properties.includes(property) || !element.matches(entry.selector)) return false;
    if (entry.value === "em") return true;
    const value = typeof entry.value === "number" ? entry.value : lengthOf(entry.value);
    return Math.abs(value - px) < 0.01;
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
      if (allowed.some((entry) => isAllowed(entry, element, property, px))) continue;
      spacing.push({ element: describe(element), property, value: round(px) });
    }
  }

  return {
    theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
    overflow: document.documentElement.scrollWidth - pageWidth,
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
  (finding) => `${finding.rule}: ${finding.end} end ${finding.fault}`,
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
