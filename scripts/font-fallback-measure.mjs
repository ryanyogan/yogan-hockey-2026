// Measures how wide the site's own text is in each local face a fallback stands on, against how
// wide it is in Newsreader and IBM Plex Sans Condensed: the `size-adjust` a fallback needs.
//
//   ESPN_FIXTURES=1 pnpm build && (cd apps/web && pnpm exec vite preview --port <PORT> --strictPort)
//   node scripts/font-fallback-measure.mjs [baseURL] [width] [Name=regular.woff2,bold.woff2 ...]
//
// Every piece of text on the five pages `font-load.mjs` opens is set again on one line, with no
// tracking, once in its real face and once in each local face, at its own size, weight and
// optical size; and, since a page has three headlines and three decks at most, every team's name
// is set in the style of each as well ("serif headline", "serif deck"). A fallback has two cuts,
// a regular for weights under 600 and a bold from 600 up, so the text is grouped that way, and a
// group's ratio is its real width over its local width, taken over the lines long enough to wrap
// (150px), since a short label only moves sideways. `packages/ui/src/font-fallbacks.css` carries
// these numbers beside the ones `@capsizecss/metrics` gives from letter frequencies
// (`scripts/font-fallbacks.ts`).
//
// A local face that this machine does not have is "absent": only a face that is there can be
// measured. Liberation Serif, Liberation Sans and Nimbus Sans Narrow are letter for letter as wide
// as Times New Roman, Arial and Arial Narrow. A face named with two files
// (`Roboto=…400.woff2,…700.woff2`, from `@fontsource/roboto`) is read from them instead, which is
// how a phone's face is measured on a desk.
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const [baseURL = "http://localhost:5173", width = "390", ...fromFiles] = process.argv.slice(2);
const PATHS = ["/", "/nhl", "/nhl/teams/21", "/players/4024123", "/nhl/games/401803652"];
/** Local faces by voice: [name, the regular cut's full name, the bold cut's full name]. */
const LOCAL = {
  serif: [
    ["Times New Roman", "Times New Roman", "Times New Roman Bold"],
    ["Liberation Serif", "Liberation Serif", "Liberation Serif Bold"],
    ["Georgia", "Georgia", "Georgia Bold"],
    ["Noto Serif", "Noto Serif Regular", "Noto Serif Bold"],
  ],
  agate: [
    ["Arial", "Arial", "Arial Bold"],
    ["Liberation Sans", "Liberation Sans", "Liberation Sans Bold"],
    ["Arial Narrow", "Arial Narrow", "Arial Narrow Bold"],
    ["Nimbus Sans Narrow", "Nimbus Sans Narrow", "Nimbus Sans Narrow Bold"],
    ["Roboto", "Roboto", "Roboto Bold"],
    ["Noto Sans", "Noto Sans Regular", "Noto Sans Bold"],
  ],
};

/** A face's two cuts as `src` values: its files where they were given, or its local names. */
const sources = {};
for (const names of Object.values(LOCAL)) {
  for (const [name, regular, bold] of names) {
    sources[name] = [`local("${regular}")`, `local("${bold}")`];
  }
}
for (const given of fromFiles) {
  const [name, files] = given.split("=");
  if (!sources[name]) throw new Error(`${name} is not a face this script measures.`);
  sources[name] = await Promise.all(
    files.split(",").map(async (file) => {
      const data = (await readFile(file)).toString("base64");
      return `url(data:font/woff2;base64,${data})`;
    }),
  );
}

const measure = async ({ local, sources, headlines }) => {
  const style = document.createElement("style");
  style.textContent = Object.entries(sources)
    .map(
      ([name, [regular, bold]]) =>
        `@font-face{font-family:"measure ${name}";src:${regular};font-weight:100 599}` +
        `@font-face{font-family:"measure ${name}";src:${bold};font-weight:600 900}`,
    )
    .join("");
  document.head.append(style);
  // A face read from a file is not there until it is asked for.
  await Promise.all(
    Object.keys(sources).flatMap((name) =>
      ["400", "700"].map((weight) =>
        document.fonts.load(`${weight} 16px "measure ${name}"`).catch(() => []),
      ),
    ),
  );
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;left:0;top:0;white-space:pre;visibility:hidden";
  document.body.append(probe);
  const widthOf = (text, from, family) => {
    probe.style.font = from.font;
    probe.style.fontVariationSettings = from.fontVariationSettings;
    probe.style.fontVariantNumeric = from.fontVariantNumeric;
    probe.style.textTransform = from.textTransform;
    probe.style.letterSpacing = "0";
    probe.style.fontFamily = family;
    probe.textContent = text;
    return probe.getBoundingClientRect().width;
  };
  // A face that is not installed falls through to the last family, as does this name.
  const absent = (name, from) =>
    widthOf("Hamburgefonstiv 0123", from, `"measure ${name}", monospace`) ===
    widthOf("Hamburgefonstiv 0123", from, "monospace");

  const groups = {};
  const add = (key, text, from, family, locals) => {
    const real = widthOf(text, from, family);
    for (const [name] of locals) {
      groups[`${key} | ${name}`] ??= { real: 0, local: 0, longReal: 0, longLocal: 0, lines: [] };
      const group = groups[`${key} | ${name}`];
      if (absent(name, from)) {
        group.absent = true;
        continue;
      }
      const there = widthOf(text, from, `"measure ${name}"`);
      group.real += real;
      group.local += there;
      // Text long enough to wrap on a phone is what moves a page.
      if (real > 150) {
        group.longReal += real;
        group.longLocal += there;
        group.lines.push(real / there);
      }
    }
  };
  // A page has three headlines and three decks at most, so every team's name is set in the
  // style of each as well.
  const styled = (selector, test) =>
    [...document.querySelectorAll(selector)].map((el) => getComputedStyle(el)).find(test);
  const corpus = {
    "serif headline": styled("h1, h2, h3", (style) => style.fontVariationSettings.includes("60")),
    "serif deck": styled(
      "p",
      (style) =>
        style.fontFamily.includes("Newsreader") &&
        style.fontStyle === "normal" &&
        Number(style.fontWeight) < 600,
    ),
  };
  for (const [key, from] of Object.entries(corpus)) {
    if (from) for (const text of headlines) add(key, text, from, "Newsreader", local.serif);
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.replace(/\s+/g, " ").trim();
    const parent = node.parentElement;
    if (text.length < 2 || !parent || parent.closest("script, style, noscript")) continue;
    if (parent.getClientRects().length === 0) continue;
    const from = getComputedStyle(parent);
    const voice = /^"?Newsreader/.test(from.fontFamily)
      ? "serif"
      : /^"?IBM Plex/.test(from.fontFamily)
        ? "agate"
        : null;
    if (!voice || from.fontStyle !== "normal") continue;
    const cut = Number(from.fontWeight) >= 600 ? "bold" : "regular";
    const family = voice === "serif" ? "Newsreader" : "IBM Plex Sans Condensed";
    add(`${voice} ${cut}`, text, from, family, local[voice]);
  }
  probe.remove();
  style.remove();
  return groups;
};

// Letters as a phone sets them: at their designed widths. Left to itself a headless Chromium on
// Linux rounds each letter of a web font to a whole pixel, which makes 15px bold Plex 7% wider
// than it is on any phone and a ratio that changes with the type size.
const browser = await chromium.launch({ args: ["--font-render-hinting=none"] });
const teams = await browser.newPage();
await teams.goto(`${baseURL}/nhl?tab=teams`, { waitUntil: "networkidle" });
const names = await teams.evaluate(() =>
  [...document.querySelectorAll("main li")].map((team) => team.textContent.trim()),
);
await teams.close();
if (names.length < 30) throw new Error(`The Teams tab listed ${names.length} teams.`);
const headlines = names.map((name, at) => `${name} at ${names[(at + 7) % names.length]}`);
const totals = {};
for (const path of PATHS) {
  const page = await browser.newPage({ viewport: { width: Number(width), height: 844 } });
  await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const groups = await page.evaluate(measure, { local: LOCAL, sources, headlines });
  for (const [key, group] of Object.entries(groups)) {
    totals[key] ??= { real: 0, local: 0, longReal: 0, longLocal: 0, lines: [], absent: false };
    const total = totals[key];
    total.real += group.real;
    total.local += group.local;
    total.longReal += group.longReal;
    total.longLocal += group.longLocal;
    total.lines.push(...group.lines);
    total.absent ||= group.absent === true;
  }
  await page.close();
}
await browser.close();

const percent = (value) => `${(value * 100).toFixed(2)}%`;
for (const [key, total] of Object.entries(totals).sort()) {
  if (total.absent || total.local === 0) {
    console.log(`${key}: absent`);
    continue;
  }
  if (total.lines.length === 0) {
    console.log(`${key}: ${percent(total.real / total.local)} over all its text; no long lines`);
    continue;
  }
  // The long lines are what wrap, so theirs is the ratio a fallback is given.
  const ratio = total.longReal / total.longLocal;
  const off = total.lines.map((line) => line / ratio - 1).sort((a, b) => a - b);
  const at = (part) => `${(off[Math.floor((off.length - 1) * part)] * 100).toFixed(1)}%`;
  console.log(
    `${key}: size-adjust ${percent(ratio)} over ${off.length} long lines, which stray ${at(0)} to ${at(1)} from it (the middle half ${at(0.25)} to ${at(0.75)}); ${percent(total.real / total.local)} over all its text`,
  );
}
