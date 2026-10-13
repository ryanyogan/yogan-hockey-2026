// Measures Home against the front page's handoff (#240, `docs/design/front-page`), in a real
// browser, and exits 1 when a line of its "Acceptance" is not met:
//
//   - the roundup's columns are one height at a desk, whatever each holds, and the pick and TV
//     line of each sit on its floor;
//   - every rule on the page is one of three kinds: 1px of `--rule`, 1px of `--hairline`, or the
//     3px double rule, which only the masthead and the footer draw;
//   - nothing on Home is filled, rounded or shadowed (the live dot is the one mark that is).
//     Borders only: a rule drawn by a pseudo-element, an outline or an `hr` would not be seen;
//   - by night the text is `#ece9e1` on `#1b1b19`, and the quiet text is 4.5:1 on it or better;
//   - on a phone nothing overflows, and every grid is one column.
//
//   node scripts/front-page-check.mjs [site] [out.json]
//
// Needs a dev server in fixture mode (`ESPN_FIXTURES=1 pnpm dev`): Home itself is measured, and
// the prototype's two slates on `/skeleton/dashboard?slate=tonight|busy`.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [site = "http://localhost:5173", out] = process.argv.slice(2);
const PAGES = [
  ["home", "/"],
  ["tonight", "/skeleton/dashboard?slate=tonight"],
  ["busy", "/skeleton/dashboard?slate=busy"],
];
const PHONES = [360, 390];
const DESK = 1440;

/** Runs in the page: every border drawn in the masthead, Home and the footer, and what is filled. */
function audit() {
  const style = getComputedStyle(document.documentElement);
  const probe = document.createElement("i");
  document.body.append(probe);
  const resolved = (token) => {
    probe.style.color = style.getPropertyValue(token);
    return getComputedStyle(probe).color;
  };
  const colours = { rule: resolved("--rule"), hairline: resolved("--hairline") };
  const quiet = resolved("--muted-foreground");
  probe.remove();
  const name = (element) => {
    const slotted = element.closest("[data-slot]");
    const slot =
      slotted?.getAttribute("data-slot") ?? element.closest("footer")?.tagName.toLowerCase();
    return slotted === element ? slot : `${slot} ${element.tagName.toLowerCase()}`;
  };
  const rules = new Map();
  const odd = [];
  const filled = [];
  const roots = document.querySelectorAll(
    '[data-slot="dateline-strip"], [data-slot="masthead"], [data-slot="section-nav"], [data-slot="home"], footer',
  );
  for (const root of roots) {
    for (const element of [root, ...root.querySelectorAll("*")]) {
      const box = getComputedStyle(element);
      if (box.display === "none" || element.closest(".sr-only")) continue;
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        const width = Number.parseFloat(box[`border${side}Width`]);
        const line = box[`border${side}Style`];
        if (width === 0 || line === "none") continue;
        const colour = box[`border${side}Color`];
        const kind =
          width === 3 && line === "double" && colour === colours.rule
            ? "3px double"
            : width === 1 && line === "solid" && colour === colours.rule
              ? "rule"
              : width === 1 && line === "solid" && colour === colours.hairline
                ? "hairline"
                : null;
        const where = `${name(element)} (${side.toLowerCase()})`;
        if (kind == null) odd.push(`${where}: ${width}px ${line} ${colour}`);
        else rules.set(`${kind} | ${where}`, (rules.get(`${kind} | ${where}`) ?? 0) + 1);
      }
      if (!root.matches('[data-slot="home"]')) continue;
      const mark = element.matches('[data-slot="live-dot"]');
      const fill = box.backgroundColor !== "rgba(0, 0, 0, 0)" && !mark;
      const round = Number.parseFloat(box.borderTopLeftRadius) > 0 && !mark;
      if (fill || round || box.boxShadow !== "none") {
        filled.push(
          `${name(element)}: ${box.backgroundColor} ${box.borderTopLeftRadius} ${box.boxShadow}`,
        );
      }
    }
  }
  const columns = [...document.querySelectorAll('[data-slot="roundup-columns"] > *')].map(
    (column) => {
      const { top, left, height, bottom } = column.getBoundingClientRect();
      const foot = column.querySelector('[data-slot="story-foot"]')?.getBoundingClientRect().bottom;
      const floor = bottom - Number.parseFloat(getComputedStyle(column).paddingBottom);
      return { top, left, height, offFloor: foot == null ? 0 : Math.abs(floor - foot) };
    },
  );
  const grids = [...document.querySelectorAll('[data-slot="home"] *')]
    .filter((element) => getComputedStyle(element).display === "grid")
    .filter((element) => !element.closest("a, li, dl"))
    .map(
      (element) =>
        `${name(element)}: ${getComputedStyle(element).gridTemplateColumns.split(" ").length}`,
    );
  const body = getComputedStyle(document.body);
  return {
    rules: [...rules].map(([rule, count]) => `${rule} ×${count}`).sort(),
    odd,
    filled,
    columns,
    grids,
    scrollWidth: document.documentElement.scrollWidth,
    wordmark: getComputedStyle(document.querySelector('[data-slot="wordmark"]')).fontSize,
    text: body.color,
    ground: body.backgroundColor,
    quiet,
    hairline: colours.hairline,
  };
}

const channel = (value) => {
  const part = value / 255;
  return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
};
const luminance = (colour) => {
  const [red, green, blue] = colour.match(/[\d.]+/g).map(Number);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};
const contrast = (one, other) => {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
};
const hex = (colour) =>
  `#${colour
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;

const browser = await chromium.launch();
const failures = [];
const report = {};
async function measure(path, width, theme) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme });
  await page.addInitScript((chosen) => localStorage.setItem("theme", chosen), theme);
  await page.goto(site + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const measured = await page.evaluate(audit);
  await page.close();
  return measured;
}

for (const [name, path] of PAGES) {
  const fail = (message) => failures.push(`${name}: ${message}`);
  const desk = await measure(path, DESK, "light");
  const heights = desk.columns.map((column) => column.height);
  if (heights.length === 0) fail("no roundup columns");
  if (new Set(heights).size > 1) fail(`columns of unequal height: ${heights.join(", ")}`);
  if (heights.some((height) => height < 300)) fail(`a column under 300px: ${heights.join(", ")}`);
  if (desk.columns.some((column) => column.offFloor > 0.5)) {
    fail("a pick or TV line off its column's floor");
  }
  const tablet = await measure(path, 768, "light");
  if (tablet.scrollWidth !== 768) fail(`768px scrolls sideways to ${tablet.scrollWidth}`);
  for (const each of desk.odd) fail(`a rule of no kind: ${each}`);
  for (const each of desk.filled) fail(`filled, rounded or shadowed: ${each}`);
  const double = desk.rules.filter((rule) => rule.startsWith("3px double"));
  if (double.some((rule) => !/masthead|footer/.test(rule)))
    fail(`a double rule on Home: ${double}`);

  const night = await measure(path, DESK, "dark");
  for (const each of [...night.odd, ...night.filled]) fail(`by night: ${each}`);
  const quiet = contrast(night.quiet, night.ground);
  if (hex(night.text) !== "#ece9e1" || hex(night.ground) !== "#1b1b19") {
    fail(`night is ${hex(night.text)} on ${hex(night.ground)}`);
  }
  if (quiet < 4.5) fail(`quiet text is ${quiet}:1 by night`);

  const phones = {};
  for (const width of PHONES) {
    const phone = await measure(path, width, "light");
    if (phone.scrollWidth !== width) fail(`${width}px scrolls sideways to ${phone.scrollWidth}`);
    const wide = phone.grids.filter((grid) => !grid.endsWith(": 1"));
    if (wide.length > 0) fail(`${width}px has a grid of more than one column: ${wide}`);
    if (new Set(phone.columns.map((column) => column.left)).size > 1)
      fail(`${width}px: columns side by side`);
    for (const each of [...phone.odd, ...phone.filled]) fail(`${width}px: ${each}`);
    phones[width] = {
      scrollWidth: phone.scrollWidth,
      wordmark: phone.wordmark,
      grids: phone.grids,
    };
  }
  report[name] = {
    columnHeights: heights,
    rules: desk.rules,
    night: {
      text: hex(night.text),
      ground: hex(night.ground),
      textContrast: contrast(night.text, night.ground),
      quiet: hex(night.quiet),
      quietContrast: quiet,
      hairline: hex(night.hairline),
      hairlineContrast: contrast(night.hairline, night.ground),
    },
    wordmarkAtDesk: desk.wordmark,
    phones,
  };
}
await browser.close();

console.log(JSON.stringify(report, null, 2));
if (out) await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) {
  console.error(`\n${failures.length} failed:\n${failures.map((each) => `  ${each}`).join("\n")}`);
  process.exit(1);
}
console.log("\nThe front page's acceptance lines are met.");
