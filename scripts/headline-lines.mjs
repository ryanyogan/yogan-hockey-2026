// Counts the lines every club's name takes as its page's headline, in Newsreader and in each
// fallback face the page is drawn in until Newsreader arrives (#225).
//
//   ESPN_FIXTURES=1 pnpm build && (cd apps/web && pnpm exec vite preview --port <PORT> --strictPort)
//   node scripts/headline-lines.mjs [baseURL] [widths, "360,390,414"]
//
// A headline that takes one line in the fallback and two in Newsreader drops everything under it
// by a line (35px at 34px) when the font arrives, which `font-load.mjs` fails; it opens one team's
// page, and this sets all 32 names in that page's own `h1`, mark and all. For each name, at each
// width, it prints the lines in each face and the name's width on one line against the column's.
// It exits 1 when a name's lines differ between Newsreader and a fallback this machine has, or
// when a name is wider than its column in any of them: the headline does not wrap (`nameplate` in
// `components/story/type.ts`), so it is one line by rule and what could go wrong is its width.
//
// A fallback this machine lacks is "absent" and not judged. Unhinted, as `font-load.mjs` is and
// for its reason: a phone sets letters at their designed widths.
import { chromium } from "@playwright/test";

const [baseURL = "http://localhost:5173", widthList = "360,390,414"] = process.argv.slice(2);
const FACES = [
  "Newsreader",
  "Newsreader Fallback: Times New Roman",
  "Newsreader Fallback: Noto Serif",
];

const measure = async ({ names, faces }) => {
  await document.fonts.ready;
  const h1 = document.querySelector("main h1");
  const text = [...h1.childNodes].findLast((node) => node.nodeType === Node.TEXT_NODE);
  const lineHeight = Number.parseFloat(getComputedStyle(h1).lineHeight);
  const column = h1.getBoundingClientRect().width;
  // A family that is not there falls through to the next, as this made-up name does.
  const widthIn = (family) => {
    h1.style.fontFamily = family;
    h1.style.whiteSpace = "nowrap";
    const range = document.createRange();
    range.selectNodeContents(h1);
    const { width } = range.getBoundingClientRect();
    h1.style.whiteSpace = "";
    return width;
  };
  text.textContent = "Hamburgefonstiv";
  const nothing = widthIn('"no such face", monospace');
  const absent = Object.fromEntries(
    faces.map((face) => [face, widthIn(`"${face}", monospace`) === nothing]),
  );
  const rows = names.map((name) => {
    text.textContent = name;
    const byFace = {};
    for (const face of faces) {
      if (absent[face]) continue;
      const width = widthIn(`"${face}"`);
      byFace[face] = {
        width: Math.round(width * 10) / 10,
        lines: Math.round(h1.getBoundingClientRect().height / lineHeight),
      };
    }
    return { name, byFace };
  });
  return { column, size: getComputedStyle(h1).fontSize, absent, rows };
};

const browser = await chromium.launch({ args: ["--font-render-hinting=none"] });
const teams = await browser.newPage();
await teams.goto(`${baseURL}/nhl?tab=teams`, { waitUntil: "networkidle" });
const names = await teams.evaluate(() =>
  [...document.querySelectorAll("main li a")].map((team) => team.textContent.trim()),
);
await teams.close();
if (names.length !== 32) throw new Error(`The Teams tab listed ${names.length} teams.`);

let changed = 0;
let overflowed = 0;
for (const width of widthList.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  await page.goto(`${baseURL}/nhl/teams/21`, { waitUntil: "networkidle" });
  const { column, size, absent, rows } = await page.evaluate(measure, { names, faces: FACES });
  await page.close();
  const short = (face) => face.replace("Newsreader Fallback: ", "");
  console.log(`\n${width} wide: a ${size} headline in a ${column}px column`);
  for (const face of FACES) if (absent[face]) console.log(`  ${short(face)}: absent`);
  for (const { name, byFace } of rows) {
    const cells = Object.entries(byFace).map(
      ([face, { width: wide, lines }]) => `${short(face)} ${lines} (${wide}px)`,
    );
    const differs = new Set(Object.values(byFace).map(({ lines }) => lines)).size > 1;
    const over = Object.values(byFace).some(({ width: wide }) => wide > column);
    if (differs) changed += 1;
    if (over) overflowed += 1;
    console.log(
      `  ${name.padEnd(24)} ${cells.join("  ")}${differs ? "  CHANGES" : ""}${over ? "  OVERFLOWS" : ""}`,
    );
  }
}
await browser.close();
console.log(
  changed === 0
    ? "\nNo name's lines differ."
    : `\n${changed} headline(s) change their lines at the swap.`,
);
if (overflowed > 0) console.log(`${overflowed} headline(s) are wider than their column.`);
process.exit(changed === 0 && overflowed === 0 ? 0 : 1);
