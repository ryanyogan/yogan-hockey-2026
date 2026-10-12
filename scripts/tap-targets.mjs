// Measures everything that can be tapped on every route at a phone's width, and checks the
// phone's shell on each: the section nav's five places, the one marked, no menu, the nav kept at the top of the screen.
//
//   node scripts/tap-targets.mjs [baseURL] [out.json] [name-prefix]
//
// WIDTH=<px> measures at another width than 390: a narrower phone wraps a sentence sooner, and
// two links that land one above the other share their reach.
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes). It
// exits 1 when a control's hit area is under 44px either way, or a shell check fails.
//
// A hit area is measured by asking the browser, not by reading a box: from the middle of the
// control it walks left, right, up and down for as long as a tap there would land on that
// control. So a link stretched over its row counts as the row, a radio as its label, and padding
// that reaches past a line of text counts, as a finger finds it.
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { PLAYER, ROUTES, seedPicks, TEAM } from "./look-routes.mjs";

const [baseURL = "http://localhost:5173", out, only] = process.argv.slice(2);
const MINIMUM = 44;
const PHONE = { width: Number(process.env.WIDTH ?? 390), height: 844 };
const PLACES = ["Home", "Scores", "Standings", "Teams", "Players"];
/**
 * Controls that are left smaller than the minimum on purpose, by their `data-slot`, each with
 * the reason. They are measured and counted, and do not fail the run.
 */
const EXEMPT = {
  "timeline-tick":
    "A game's plays on a line 358px long, each tick 4 to 6px wide and 16 or 32px tall: a hundred of them cannot each be 44px wide. On the plays tab the rows of the plays list pick the same plays at full size; on the scoring and pick tabs nothing else does.",
};

/**
 * A page as a visitor leaves it after doing something that draws more to tap. Each is measured
 * as well as the page as it loads.
 */
const STATES = {
  // Home has no score strip; any other page has, and its slate opens.
  scores: [
    {
      name: "the whole slate open",
      act: (page) => page.getByRole("button", { name: /^All \d+ games$/ }).click(),
    },
  ],
  players: [
    {
      name: "search results",
      act: async (page) => {
        await page.locator('main input[name="q"]').fill("mar");
        await page.locator('main a[href^="/players/"]').first().waitFor();
      },
    },
  ],
};

/** Runs in the page: every control drawn, with the area a tap on it covers. */
const measureTargets = async ([minimum, exempt]) => {
  const CONTROLS =
    'a[href], button, summary, label, select, textarea, input:not([type="hidden"]), [role="button"], [role="tab"], [role="radio"], [role="link"]';
  /** The control a tap on `node` reaches: a radio or checkbox is reached through its label. */
  const owner = (node) => {
    const control = node?.closest?.(CONTROLS);
    if (control == null) return null;
    if (control.matches("input, select, textarea") && control.labels?.length > 0)
      return control.labels[0];
    return control;
  };
  const rendered = (element) => {
    if (element.getClientRects().length === 0) return false;
    return getComputedStyle(element).visibility !== "hidden";
  };
  const targets = [...document.querySelectorAll(CONTROLS)].filter((element) => {
    if (!rendered(element) || element.disabled) return false;
    // Reached by the keyboard only: it is off the screen until it has the focus.
    if (element.matches(".skip-link")) return false;
    if (element.matches("label")) return element.control != null;
    // Measured as its label.
    if (element.matches("input, select, textarea") && element.labels?.length > 0) return false;
    return true;
  });

  const results = [];
  for (const target of targets) {
    target.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const lands = (x, y) => owner(document.elementFromPoint(x, y)) === target;
    // A link that wraps has a box per line; any of its lines, or its box's middle, will do.
    const boxes = [target.getBoundingClientRect(), ...target.getClientRects()];
    const start = boxes
      .map((box) => [box.left + box.width / 2, box.top + box.height / 2])
      .find(([x, y]) => lands(x, y));
    const drawn = boxes[0];
    const entry = {
      tag: target.tagName.toLowerCase(),
      slot: target.closest("[data-slot]")?.dataset.slot ?? null,
      within: target.closest("header, footer, nav, main")?.tagName.toLowerCase() ?? null,
      name: (target.getAttribute("aria-label") ?? target.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 48),
      href: target.getAttribute("href"),
      drawn: [Math.round(drawn.width * 10) / 10, Math.round(drawn.height * 10) / 10],
    };
    if (exempt.includes(target.dataset.slot)) entry.exempt = true;
    if (start == null) {
      results.push({ ...entry, covered: true });
      continue;
    }
    /** How far from the start a tap still lands, along one direction, to a tenth of a pixel. */
    const reach = (dx, dy) => {
      let inside = 0;
      while (inside < 400 && lands(start[0] + dx * (inside + 1), start[1] + dy * (inside + 1)))
        inside += 1;
      let [low, high] = [inside, inside + 1];
      while (high - low > 0.01) {
        const middle = (low + high) / 2;
        if (lands(start[0] + dx * middle, start[1] + dy * middle)) low = middle;
        else high = middle;
      }
      return low;
    };
    const width = Math.round((reach(-1, 0) + reach(1, 0)) * 10) / 10;
    const height = Math.round((reach(0, -1) + reach(0, 1)) * 10) / 10;
    results.push({ ...entry, width, height, small: width < minimum || height < minimum });
  }
  scrollTo(0, 0);
  return results;
};

/** Runs in the page: the phone's shell as it stands, scrolled to the end of the page. */
const measureShell = async () => {
  scrollTo(0, document.documentElement.scrollHeight);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const bar = document.querySelector('[data-slot="section-nav"]');
  const links = [...bar.querySelectorAll("a")];
  const shell = {
    places: links.map((link) => link.textContent),
    current: links
      .filter((link) => link.getAttribute("aria-current") === "page")
      .map((link) => link.textContent),
    barTop: bar.getBoundingClientRect().top,
    // Whether the wordmark above the nav has scrolled off the screen.
    mastheadGone:
      document.querySelector('[data-slot="masthead"]').getBoundingClientRect().bottom <= 0,
    menuButtons: [...document.querySelectorAll("button")].filter((button) =>
      /menu/i.test(`${button.textContent} ${button.getAttribute("aria-label") ?? ""}`),
    ).length,
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    overflow: document.documentElement.scrollWidth - innerWidth,
    // A reach that pokes out of a table would make the table scroll up and down in its own box.
    scrollingTables: [...document.querySelectorAll('[data-slot="ledger"]')].filter(
      (table) => table.scrollHeight > table.clientHeight,
    ).length,
  };
  scrollTo(0, 0);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return shell;
};

/** The rows of one page gathered by kind, so a table of thirty-two teams is one line. */
function summary(targets) {
  const kinds = new Map();
  for (const target of targets) {
    const size = target.covered ? "covered" : `${target.width}x${target.height}`;
    // Exempt controls differ by a fraction each; one line for them all.
    const key = target.exempt
      ? `exempt ${target.slot}`
      : [target.within, target.slot, target.tag, size].join(" ");
    const kind = kinds.get(key) ?? {
      within: target.within,
      slot: target.slot,
      tag: target.tag,
      size: target.exempt ? "exempt" : size,
      count: 0,
      example: target.name,
    };
    kind.count += 1;
    kinds.set(key, kind);
  }
  return [...kinds.values()];
}

const browser = await chromium.launch();
await seedPicks(browser, baseURL);
const pages = [];
const failures = [];

for (const route of ROUTES) {
  if (only && !route.name.startsWith(only)) continue;
  const context = await browser.newContext({
    viewport: PHONE,
    hasTouch: true,
    timezoneId: "America/Chicago",
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    ([team, player]) => {
      localStorage.setItem("theme", "light");
      localStorage.setItem("favorite_teams", JSON.stringify([team]));
      localStorage.setItem("favorite_players", JSON.stringify([player]));
    },
    [TEAM, PLAYER],
  );
  const page = await context.newPage();
  await page.goto(`${baseURL}${route.path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (route.waitFor) await page.locator(route.waitFor).first().waitFor();
  // The page answers a tap only once it has hydrated.
  if (!route.overlay) await page.waitForFunction(() => window.__NEXT_HYDRATED === true);
  await page.waitForTimeout(300);
  if (route.overlay) {
    await page.evaluate(() => {
      document.getElementById("__vinext_dev_error_overlay_root")?.remove();
    });
  }

  for (const state of [{ name: "as it loads", act: null }, ...(STATES[route.name] ?? [])]) {
    if (state.act) {
      await state.act(page);
      await page.waitForTimeout(300);
    }
    const shell = await page.evaluate(measureShell);
    const targets = await page.evaluate(measureTargets, [MINIMUM, Object.keys(EXEMPT)]);
    const small = targets.filter((target) => !target.exempt && (target.small || target.covered));
    const failed = [];
    if (shell.places.join() !== PLACES.join()) failed.push(`section nav holds ${shell.places}`);
    if (shell.current.join() !== (route.place ?? ""))
      failed.push(`section nav marks "${shell.current}", not "${route.place ?? ""}"`);
    if (shell.menuButtons > 0 || shell.dialogs > 0) failed.push("a menu is drawn");
    // Scrolled past the masthead, the sections are still at the top of the screen.
    if (shell.barTop < 0 || (shell.mastheadGone && shell.barTop !== 0))
      failed.push(`the section nav is ${shell.barTop}px from the top of the screen`);
    if (shell.overflow > 0) failed.push(`overflows by ${shell.overflow}px`);
    if (shell.scrollingTables > 0)
      failed.push(`${shell.scrollingTables} tables scroll in their own box`);
    if (small.length > 0) failed.push(`${small.length} under ${MINIMUM}px`);
    const sizes = targets.filter((target) => !target.covered && !target.exempt);
    const entry = {
      route: route.name,
      path: route.path,
      state: state.name,
      controls: targets.length,
      exempt: targets.filter((target) => target.exempt).length,
      narrowest: Math.min(...sizes.map((target) => target.width)),
      shortest: Math.min(...sizes.map((target) => target.height)),
      shell,
      small,
      kinds: summary(targets),
      failed,
    };
    pages.push(entry);
    if (failed.length > 0) failures.push(entry);
    console.log(
      `${route.name} (${state.name}): ${entry.controls} controls, narrowest ${entry.narrowest}px, shortest ${entry.shortest}px${failed.length > 0 ? `; FAILED ${failed.join("; ")}` : ""}`,
    );
    for (const target of small) {
      console.log(
        `  ${target.covered ? "covered" : `${target.width}x${target.height}`} ${target.tag} "${target.name}" in ${target.within}${target.slot ? ` [${target.slot}]` : ""}, drawn ${target.drawn.join("x")}`,
      );
    }
  }
  await context.close();
}
await browser.close();

if (out && !only) {
  await writeFile(
    out,
    `${JSON.stringify({ baseURL, viewport: PHONE, minimum: MINIMUM, exempt: EXEMPT, measuredAt: new Date().toISOString(), pages }, null, 2)}\n`,
  );
}
console.log(`${pages.length} pages, ${failures.length} failed`);
process.exit(failures.length > 0 || pages.length === 0 ? 1 : 0);
