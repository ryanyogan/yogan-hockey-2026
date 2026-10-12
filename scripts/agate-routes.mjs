// Shoots the routes the Agate prototype does not draw (#173) at 390 and 1440 in both themes, and
// checks each against the system by computed style (docs/design/agate.md): two faces, the
// colours of the tokens and no others, no radius or shadow, no fill but the row under the
// pointer, ink (the current tab) and the live dot, the four rules, tabular figures, and no sideways scroll.
//
//   node scripts/agate-routes.mjs [baseURL] [scratchDir] [name-prefix]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes). It
// writes `<route>-<width>-<theme>.png` and prints each page's type roles (face, size, weight and
// how many elements) to be read against agate.md § Type; it exits 1 on anything outside the
// system. A shot is the top of its page: MAX_HEIGHT px of it, since a schedule is 81 rows.
//
// Every shot is taken and meant to be looked at; only the ones in KEPT are the repository's
// (`docs/design/agate/`), one or two of each route across the widths and themes. The rest go to
// the scratch directory. Each route is also checked, not shot, at 360px: no sideways scroll, and
// no strip of tabs that scrolls.
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { seedPicks, TEAM } from "./look-routes.mjs";

const [baseURL = "http://localhost:5173", scratchDir = "node_modules/.tmp/agate-routes", only] =
  process.argv.slice(2);
const KEPT_DIR = "docs/design/agate";
const KEPT = new Set([
  "scores-live-390-light",
  "scores-live-1440-light",
  "scores-live-1440-dark",
  "scores-390-dark",
  "standings-390-light",
  "standings-1440-light",
  "standings-1440-dark",
  "standings-wildcard-390-dark",
  "teams-390-light",
  "teams-1440-dark",
  "team-390-light",
  "team-390-dark",
  "team-1440-light",
  "team-roster-1440-light",
  "team-stats-390-dark",
  "team-not-found-390-light",
]);
const MAX_HEIGHT = Number(process.env.MAX_HEIGHT ?? 1500);
const WIDTHS = [390, 1440];
/** The narrowest phone the site is laid out for. */
const NARROW = 360;
const THEMES = ["light", "dark"];

const ROUTES = [
  { name: "scores", path: "/nhl/live" },
  // The sample slate: games in progress, finished and to come.
  { name: "scores-live", path: "/skeleton/live" },
  { name: "standings", path: "/nhl" },
  { name: "standings-conference", path: "/nhl?view=conference" },
  { name: "standings-wildcard", path: "/nhl?view=wildcard" },
  { name: "standings-league", path: "/nhl?view=league" },
  { name: "teams", path: "/nhl?tab=teams" },
  { name: "team", path: `/nhl/teams/${TEAM}` },
  { name: "team-roster", path: `/nhl/teams/${TEAM}/roster` },
  { name: "team-stats", path: `/nhl/teams/${TEAM}/stats` },
  { name: "team-not-found", path: "/nhl/teams/leafs", status: 404 },
].filter((route) => only == null || route.name.startsWith(only));

/** Runs in the page: everything under `<main>` that is outside the system. */
function audit() {
  const probe = document.createElement("span");
  document.body.append(probe);
  const token = (name) => {
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color;
  };
  const names = (list) => Object.fromEntries(list.map((name) => [token(name), name]));
  const TEXT = names([
    "--foreground",
    "--note",
    "--label",
    "--aside",
    "--kicker",
    "--background",
    "--positive",
    "--negative",
  ]);
  const FILL = names(["--highlight", "--foreground", "--background", "--live"]);
  const RULE = names(["--rule", "--rule-head", "--border", "--kicker", "--input"]);
  probe.remove();

  const faults = [];
  const roles = {};
  const rules = {};
  const say = (el, what) => {
    const slot = el.closest("[data-slot]")?.getAttribute("data-slot") ?? "";
    faults.push(
      `${what} · <${el.tagName.toLowerCase()}> in ${slot} · "${el.textContent.trim().slice(0, 30)}"`,
    );
  };
  const visible = (el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden";
  };

  for (const el of document.querySelectorAll("main *")) {
    if (!visible(el) || el.closest("svg") || el.closest("[class~=sr-only]")) continue;
    const style = getComputedStyle(el);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== "");
    if (own) {
      // Fontsource names the variable file's family "Newsreader Variable": the same face.
      const face = style.fontFamily
        .split(",")[0]
        .replaceAll(/['"]/g, "")
        .trim()
        .replace(/ Variable$/, "");
      const role = `${face} ${style.fontSize} ${style.fontWeight}${style.fontStyle === "italic" ? " italic" : ""}`;
      roles[role] = (roles[role] ?? 0) + 1;
      if (face !== "Newsreader" && face !== "IBM Plex Sans Condensed") say(el, `face ${face}`);
      if (!(style.color in TEXT)) say(el, `text colour ${style.color}`);
      if (/\d/.test(el.textContent) && !style.fontVariantNumeric.includes("tabular-nums")) {
        say(el, "figures not tabular");
      }
    }
    if (style.boxShadow !== "none") say(el, `shadow ${style.boxShadow}`);
    // The live dot is the one round thing: drawn, since the face has no "●".
    const dot = el.closest('[data-slot="live-marker"]') != null && el.getAttribute("aria-hidden");
    if (style.borderRadius !== "0px" && !dot) say(el, `radius ${style.borderRadius}`);
    const fill = style.backgroundColor;
    if (fill !== "rgba(0, 0, 0, 0)" && !(fill in FILL)) say(el, `fill ${fill}`);
    if (fill in FILL && FILL[fill] !== "--background") {
      rules[`fill ${FILL[fill]}`] = (rules[`fill ${FILL[fill]}`] ?? 0) + 1;
    }
    for (const side of ["Top", "Bottom", "Left", "Right"]) {
      const width = style[`border${side}Width`];
      const colour = style[`border${side}Color`];
      // A border that is there for its width alone draws nothing.
      if (width === "0px" || colour === "rgba(0, 0, 0, 0)") continue;
      const kind = `${width} ${style[`border${side}Style`]} ${RULE[colour] ?? TEXT[colour] ?? colour}`;
      rules[kind] = (rules[kind] ?? 0) + 1;
      if (!(colour in RULE) && !(colour in TEXT)) say(el, `rule colour ${colour}`);
    }
  }
  // A strip of tabs that scrolls hides its last tab where nobody knows to look for it.
  for (const strip of document.querySelectorAll("main [data-slot=url-tabs]")) {
    if (strip.scrollWidth > strip.clientWidth) {
      say(strip, `tabs scroll: ${strip.scrollWidth} in ${strip.clientWidth}`);
    }
  }
  const page = document.documentElement;
  return { faults: [...new Set(faults)], roles, rules, scrollWidth: page.scrollWidth };
}

await mkdir(scratchDir, { recursive: true });
const browser = await chromium.launch();
// The sample picks are written by `/skeleton/picks`, which the port to TanStack Start has not
// reached (#192). Until it is back the dateline is shot without its record of the picks.
if ((await fetch(`${baseURL}/skeleton/picks`)).ok) await seedPicks(browser, baseURL);
else console.log("no /skeleton/picks on this site: shot without the sample picks");
let failed = 0;
for (const route of ROUTES) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
        timezoneId: "America/Toronto",
      });
      const page = await context.newPage();
      const response = await page.goto(baseURL + route.path, { waitUntil: "networkidle" });
      if (response?.status() !== (route.status ?? 200)) {
        console.log(`FAIL ${route.name}: status ${response?.status()}`);
        failed += 1;
      }
      await page.evaluate(() => document.fonts.ready);
      const found = await page.evaluate(audit);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      const shot = `${route.name}-${width}-${theme}`;
      await page.screenshot({
        path: `${KEPT.has(shot) ? KEPT_DIR : scratchDir}/${shot}.png`,
        fullPage: true,
        clip: { x: 0, y: 0, width, height: Math.min(height, MAX_HEIGHT) },
      });
      const wide = found.scrollWidth !== width;
      if (wide) found.faults.push(`scrollWidth ${found.scrollWidth} at ${width}`);
      failed += found.faults.length;
      console.log(`${found.faults.length === 0 ? "ok  " : "FAIL"} ${route.name} ${width} ${theme}`);
      for (const fault of found.faults) console.log(`       ${fault}`);
      if (theme === "light") {
        console.log(`       type  ${JSON.stringify(found.roles)}`);
        console.log(`       rules ${JSON.stringify(found.rules)}`);
      }
      await context.close();
    }
  }
  const context = await browser.newContext({ viewport: { width: NARROW, height: 800 } });
  const page = await context.newPage();
  const response = await page.goto(baseURL + route.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const found = await page.evaluate(audit);
  // A page that did not load is as narrow as anyone could wish.
  const loaded = response?.status() === (route.status ?? 200);
  if (!loaded) found.faults.push(`tabs scroll unknown: status ${response?.status()}`);
  const faults = found.faults.filter((fault) => fault.startsWith("tabs scroll"));
  if (found.scrollWidth !== NARROW) faults.push(`scrollWidth ${found.scrollWidth} at ${NARROW}`);
  failed += faults.length;
  console.log(`${faults.length === 0 ? "ok  " : "FAIL"} ${route.name} ${NARROW}`);
  for (const fault of faults) console.log(`       ${fault}`);
  await context.close();
}
await browser.close();
process.exit(failed === 0 ? 0 : 1);
