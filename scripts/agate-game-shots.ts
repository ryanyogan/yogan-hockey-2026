// Screenshots and measurements of the routes #173's second half redrew in Agate: the game page
// in its three states and its tabs, a player's pages, the player search, and the pages for a
// failure and a missing address. For docs/design/agate.
//
//   node scripts/agate-game-shots.ts [baseURL] [scratchDir]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes), and
// not the server Playwright's own run uses. Each page is shot as <name>-<width>-<theme>.png at
// 390 and 1440 in both themes. The pictures the repository keeps (`KEPT`: a page of each kind on a
// light phone and at a dark desk) go to docs/design/agate; the rest are for looking at and go to
// the scratch directory, node_modules/.tmp/agate-game-shots unless another is named. For each the
// script prints what it measured: the document's
// `scrollWidth`, the story's type against the prototype's values (`prototypes/agate/style.css`),
// and every colour, face, radius and shadow on the page that is not one of the theme's. It exits
// 1 on any of those.
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";
import { driveGame, recordedGame, SCHEDULED_GAME } from "../e2e/game-driver.ts";
import { PLAYER, seedPicks } from "./look-routes.mjs";

const [baseURL = "http://localhost:5173", scratchDir = "node_modules/.tmp/agate-game-shots"] =
  process.argv.slice(2);
mkdirSync(scratchDir, { recursive: true });

/** The pages whose pictures are kept in the repository, each on a light phone and at a dark desk. */
const KEPT = new Set([
  "game-scheduled",
  "game-live",
  "game-final",
  "game-replay",
  "game-pick",
  "players-search",
  "player",
  "not-found",
]);
const KEPT_AT = new Set(["390-light", "1440-dark"]);
const pictureOf = (name: string, width: number, theme: string) =>
  `${KEPT.has(name) && KEPT_AT.has(`${width}-${theme}`) ? "docs/design/agate" : scratchDir}/${name}-${width}-${theme}.png`;
const FINAL_GAME = "401803652";
const game = await recordedGame(baseURL);
const midSecond =
  game.plays.findLastIndex((play) => play.type === "period-end" && play.period === 2) - 40;

/** The prototype's story, by part: what each must compute to at a desk and on a phone. */
const STORY: Record<string, (wide: boolean) => Record<string, string>> = {
  kicker: () => ({
    fontFamily: "IBM Plex Sans Condensed",
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "1.68px",
    textTransform: "uppercase",
    color: "kicker",
  }),
  headline: (wide) => ({
    fontFamily: "Newsreader",
    // clamp(34px, 3vw, 40px): 40px at 1440, 34px at 390.
    fontSize: wide ? "40px" : "34px",
    fontWeight: "700",
    letterSpacing: wide ? "-0.6px" : "-0.51px",
    color: "foreground",
  }),
  deck: (wide) => ({
    fontFamily: "Newsreader",
    fontSize: wide ? "19px" : "18px",
    fontWeight: "400",
    color: "note",
  }),
  "pick-lead": () => ({
    fontFamily: "Newsreader",
    fontSize: "17px",
    fontStyle: "italic",
    fontWeight: "400",
  }),
};

/** Everything on the page that is off the system, read from computed styles in the browser. */
async function measure(page: Page, wide: boolean) {
  return page.evaluate(
    ({ story, wide }) => {
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement("span");
      document.body.append(probe);
      const resolved = (value: string) => {
        probe.style.color = value;
        return getComputedStyle(probe).color;
      };
      const TOKENS = [
        "background",
        "foreground",
        "note",
        "label",
        "aside",
        "kicker",
        "live",
        "highlight",
        "rule",
        "rule-head",
        "border",
        "positive",
        "negative",
        "ring",
      ];
      // Two names can be one colour (`--live` is `--kicker`, `--rule` is the text's).
      const tokens = new Map<string, string[]>();
      for (const name of TOKENS) {
        const colour = resolved(root.getPropertyValue(`--${name}`));
        tokens.set(colour, [...(tokens.get(colour) ?? []), name]);
      }
      const named = (colour: string) => tokens.get(colour)?.join("/") ?? colour;
      probe.remove();
      const clear = (colour: string) => colour === "rgba(0, 0, 0, 0)" || colour === "transparent";
      const faults = new Set<string>();
      const main = document.querySelector("main") ?? document.body;
      for (const element of main.querySelectorAll<HTMLElement>("*")) {
        const style = getComputedStyle(element);
        if (
          style.display === "none" ||
          element.closest("[data-slot=team-mark], vite-error-overlay")
        )
          continue;
        const name = `${element.tagName.toLowerCase()}${element.dataset.slot ? `[${element.dataset.slot}]` : ""}`;
        const svg = element instanceof SVGElement;
        // Only what is drawn: a group or a pattern's own fill is the browser's black, unused.
        if (svg && !element.matches("rect, circle, line, path, ellipse")) continue;
        if (svg && element.closest("defs") != null) continue;
        const colours = svg
          ? [element.matches("line") ? "none" : style.fill, style.stroke]
          : [style.color, style.backgroundColor, style.borderTopColor, style.borderBottomColor];
        for (const colour of colours) {
          // A stroke or fill at part strength is still the token's ink.
          const solid = colour.replace(/rgba\((\d+), (\d+), (\d+), [\d.]+\)/, "rgb($1, $2, $3)");
          if (
            colour === "none" ||
            colour.startsWith("url(") ||
            clear(colour) ||
            tokens.has(colour) ||
            tokens.has(solid)
          )
            continue;
          faults.add(`${name}: colour ${colour}`);
        }
        if (svg) continue;
        if (element.childNodes.length > 0 && /mono|Geist/i.test(style.fontFamily))
          faults.add(`${name}: face ${style.fontFamily}`);
        if (style.boxShadow !== "none") faults.add(`${name}: shadow ${style.boxShadow}`);
        // The live dot, 8px across, is the one round thing in the prototype.
        if (style.borderTopLeftRadius !== "0px" && element.offsetWidth > 8)
          faults.add(`${name}: radius ${style.borderTopLeftRadius}`);
        const text = [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && /\d/.test(node.textContent ?? ""),
        );
        // Agate figures line up in columns. The prototype's story parts set `font:` whole, which
        // puts their figures back to the face's own: the serif's, and the kicker's.
        const storys = /Newsreader/.test(style.fontFamily) || element.dataset.slot === "kicker";
        if (text && !storys && !/tabular-nums/.test(style.fontVariantNumeric))
          faults.add(`${name}: figures not tabular`);
      }
      for (const [slot, want] of Object.entries(story)) {
        const element = document.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
        if (element == null) continue;
        const style = getComputedStyle(element) as unknown as Record<string, string>;
        for (const [property, value] of Object.entries(want)) {
          const got =
            property === "color"
              ? tokens.get(style.color)?.includes(value)
                ? value
                : named(style.color)
              : property === "fontFamily"
                ? // Fontsource names a variable face "Newsreader Variable": the same face.
                  style.fontFamily
                    .split(",")[0]
                    .replaceAll(/["']/g, "")
                    .replace(/ Variable$/, "")
                : style[property];
          if (got !== value)
            faults.add(`${slot}: ${property} is ${got}, the prototype's is ${value}`);
        }
      }
      const rule = document.querySelector<HTMLElement>(
        '[data-slot="game-story"], [data-slot="page-header"]',
      );
      const top = rule == null ? null : getComputedStyle(rule);
      return {
        scrollWidth: document.documentElement.scrollWidth,
        rule: top == null ? null : `${top.borderTopWidth} ${named(top.borderTopColor)}`,
        faults: [...faults],
        wide,
      };
    },
    { story: Object.fromEntries(Object.entries(STORY).map(([k, v]) => [k, v(wide)])), wide },
  );
}

const browser = await chromium.launch();
await seedPicks(browser, baseURL);
let failed = false;

for (const theme of ["light", "dark"] as const) {
  for (const width of [1440, 390]) {
    const wide = width >= 768;
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      colorScheme: theme,
      timezoneId: "America/Chicago",
    });
    const shot = async (name: string) => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      await page.screenshot({ path: pictureOf(name, width, theme), fullPage: true });
      const { scrollWidth, rule, faults } = await measure(page, wide);
      const wider = scrollWidth !== width;
      if (wider || faults.length > 0) failed = true;
      console.log(
        `${name} ${width} ${theme}: scrollWidth ${scrollWidth}${wider ? " (SCROLLS)" : ""}, top rule ${rule}${
          faults.length === 0 ? "" : `\n  ${faults.join("\n  ")}`
        }`,
      );
    };
    const open = async (path: string, waitFor?: string) => {
      await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
      if (waitFor) await page.locator(waitFor).first().waitFor();
    };

    const driver = await driveGame(page, SCHEDULED_GAME);
    await open(`/nhl/games/${SCHEDULED_GAME}`, '[data-slot="game-story"]');
    await shot("game-scheduled");
    driver.agent(
      { header: game.liveAfter(midSecond, 2), delayed: false, archived: false },
      game.plays.slice(0, midSecond),
    );
    await driver.scoreboard({
      status: "live",
      period: 2,
      clock: "8:12",
      scores: game.liveAfter(midSecond, 2),
    });
    await page.locator('[data-slot="game-view"]').waitFor();
    await shot("game-live");
    await page.close();

    // Fresh pages for the rest: the driven one's sockets are the driver's.
    const rest = await browser.newPage({
      viewport: { width, height: 900 },
      colorScheme: theme,
      timezoneId: "America/Chicago",
    });
    const restShot = async (
      name: string,
      path: string,
      waitFor?: string,
      act?: () => Promise<void>,
    ) => {
      await rest.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
      if (waitFor) await rest.locator(waitFor).first().waitFor();
      await act?.();
      await rest.evaluate(() => document.fonts.ready);
      await rest.waitForTimeout(400);
      await rest.screenshot({ path: pictureOf(name, width, theme), fullPage: true });
      const { scrollWidth, rule, faults } = await measure(rest, wide);
      const wider = scrollWidth !== width;
      if (wider || faults.length > 0) failed = true;
      console.log(
        `${name} ${width} ${theme}: scrollWidth ${scrollWidth}${wider ? " (SCROLLS)" : ""}, top rule ${rule}${
          faults.length === 0 ? "" : `\n  ${faults.join("\n  ")}`
        }`,
      );
    };
    await restShot("game-final", `/nhl/games/${FINAL_GAME}`, '[data-slot="replay-transport"]');
    await restShot(
      "game-replay",
      `/nhl/games/${FINAL_GAME}`,
      '[data-slot="replay-transport"]',
      async () => {
        // Step to a goal: its dot, its caption and its flag are on the ice.
        await rest.locator('[data-slot="timeline-tick"][data-kind="goal"]').first().click();
        await rest.locator('[data-slot="goal-flag"]').first().waitFor({ state: "attached" });
        await rest.waitForTimeout(2500);
        // The click scrolled to the tick and left the focus on it, and the pointer over a row.
        await rest.mouse.move(0, 0);
        await rest.evaluate(() => {
          (document.activeElement as HTMLElement | null)?.blur();
          window.scrollTo(0, 0);
        });
      },
    );
    await restShot(
      "game-scoring",
      `/nhl/games/${FINAL_GAME}/scoring`,
      '[data-slot="scoring-summary"]',
    );
    await restShot("game-pick", `/nhl/games/${FINAL_GAME}/pick`, '[data-slot="game-pick-full"]');
    await restShot("players", "/players", 'input[type="search"]');
    await restShot("players-search", "/players?q=mar", '[data-slot="ledger"]');
    // Fixture mode has one recorded search ("mar"): any other is ESPN not answering.
    await restShot("players-unavailable", "/players?q=zz", '[role="status"]');
    await restShot("player", `/players/${PLAYER}`, '[data-slot="player-header"]');
    await restShot("not-found", "/no-such-page");
    await restShot("game-not-found", "/nhl/games/not-a-game");
    await rest.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
