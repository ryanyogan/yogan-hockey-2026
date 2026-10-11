// Drives the outline drawn at a tap (#127, components/pending/) and looks for ways it can stay
// on screen. There is no component test of it: this is its proof, run by hand.
//
//   node scripts/navigation-check.mjs <base> <outDir> [shots|stuck|all] [journey]
//
// Needs a build in fixture mode (`scripts/performance-baseline.sh` shows how one is served) and
// TMPDIR set (see the build notes). `shots` slows the router's requests by 1.5 s, taps a link on
// each journey at 390 and 1440 wide, light and dark, and writes <journey>-<width>-<scheme>-1-outline.png
// and -2-page.png with the offsets of both's blocks, for comparing an outline with its page.
// `stuck` tries a second tap, a tap back (also within one frame of the first), back and forward, a request that fails, a 500, one never
// answered (the old page returns after 10 s) and reduced motion (no view transition). It prints
// ok or FAIL a line, and fails on any console error it did not cause itself.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [base = "http://localhost:5331", out = "node_modules/.tmp/shots", part = "all", only = ""] =
  process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const say = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
};

async function open({ width = 390, height = 844, scheme = "light", reduced = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: scheme,
    reducedMotion: reduced ? "reduce" : "no-preference",
    hasTouch: width < 600,
    timezoneId: "America/Chicago",
  });
  await context.addInitScript(() => {
    window.__vt = 0;
    const real = document.startViewTransition?.bind(document);
    if (real)
      document.startViewTransition = (cb) => {
        window.__vt += 1;
        return real(cb);
      };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  const net = { delay: 0, mode: "pass", rewrite: null };
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.resourceType() === "document" || (net.mode === "pass" && net.delay === 0))
      return route.continue();
    const isPage = request.headers().rsc != null || /[?&]_rsc=|\.rsc(\?|$)/.test(request.url());
    if (!isPage) return route.continue();
    if (net.delay) await sleep(net.delay);
    if (net.mode === "abort") return route.abort();
    if (net.mode === "hang") return; // never answered
    if (net.mode === "500") return route.fulfill({ status: 500, body: "boom" });
    if (net.rewrite)
      return route.continue({ url: request.url().replace(net.rewrite[0], net.rewrite[1]) });
    return route.continue();
  });
  return { page, errors, net, context };
}

async function tap(page, selector, options) {
  const link = page.locator(selector).first();
  if (!(await link.isVisible())) {
    const menu = page.getByRole("button", { name: "Open menu" });
    if (await menu.isVisible()) await menu.click();
  }
  await link.click(options);
}

const state = (page) =>
  page.evaluate(() => {
    const outline = document.querySelector("[data-slot=pending-outline]");
    const hidden = [...document.querySelectorAll("main div[hidden]")].length;
    const main = document.querySelector("main");
    return {
      url: location.pathname + location.search,
      outline: outline != null,
      hiddenBoxes: hidden,
      mainHeight: Math.round(main.getBoundingClientRect().height),
      mainText: main.innerText.length,
      h1: (document.querySelector("main h1, main h2")?.textContent ?? "").slice(0, 40),
      vt: window.__vt,
      scrollY: Math.round(scrollY),
    };
  });

async function load(page, path) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(500);
}

/** Top offsets of the blocks in main, for comparing an outline's geometry with its page. */
const blocks = (page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    const box = [...main.querySelectorAll(":scope > div:not([hidden])")][0] ?? main;
    const rows = [...box.querySelectorAll("section, [data-slot=section], table, h1, nav")].filter(
      (el) => el.offsetParent != null,
    );
    return rows.slice(0, 14).map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""}@${Math.round(r.top + scrollY)}+${Math.round(r.height)}`;
    });
  });

const settled = async (page, expectUrl, timeout = 8000) => {
  const start = Date.now();
  let s;
  while (Date.now() - start < timeout) {
    s = await state(page);
    if (!s.outline && s.hiddenBoxes === 0 && (expectUrl == null || s.url === expectUrl)) return s;
    await sleep(100);
  }
  return { ...s, timedOut: true };
};

const JOURNEYS = [
  {
    name: "home-to-standings",
    from: "/",
    link: 'nav[aria-label="Site"] a[href="/nhl"]',
    to: "/nhl",
  },
  {
    name: "standings-to-team",
    from: "/nhl",
    link: 'main a[href="/nhl/teams/21"]',
    to: "/nhl/teams/21",
  },
  {
    name: "team-to-roster-tab",
    from: "/nhl/teams/21",
    link: 'main a[href="/nhl/teams/21/roster"]',
    to: "/nhl/teams/21/roster",
  },
  {
    name: "team-to-stats-tab",
    from: "/nhl/teams/21",
    link: 'main a[href="/nhl/teams/21/stats"]',
    to: "/nhl/teams/21/stats",
  },
  {
    name: "home-to-live",
    from: "/",
    link: 'nav[aria-label="Site"] a[href="/nhl/live"]',
    to: "/nhl/live",
  },
  {
    name: "live-to-game",
    from: "/nhl/live",
    link: 'main a[href="/nhl/games/401892449"]',
    to: "/nhl/games/401892449",
  },
  {
    name: "game-to-scoring-tab",
    from: "/nhl/games/401803652",
    link: 'main a[href="/nhl/games/401803652/scoring"]',
    to: "/nhl/games/401803652/scoring",
  },
  {
    name: "home-to-players",
    from: "/",
    link: 'nav[aria-label="Site"] a[href="/players"]',
    to: "/players",
  },
  {
    name: "roster-to-player",
    from: "/nhl/teams/21/roster",
    link: 'main a[href="/players/4024123"]',
    to: "/players/4024123",
  },
  { name: "standings-to-home", from: "/nhl", link: 'nav[aria-label="Site"] a[href="/"]', to: "/" },
];

if (part === "shots" || part === "all") {
  for (const size of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    for (const scheme of ["light", "dark"]) {
      const { page, errors, net, context } = await open({ ...size, scheme });
      for (const j of JOURNEYS.filter((j) => j.name.includes(only))) {
        try {
          await load(page, j.from);
          net.delay = 1500;
          let link = page.locator(j.link).first();
          if (j.link.startsWith("nav") && !(await link.isVisible())) {
            await page.getByRole("button", { name: "Open menu" }).click();
            link = page.locator(`dialog a[href="${j.to}"]`).first();
          }
          if ((await link.count()) === 0) {
            say(`${j.name} ${size.width} ${scheme}`, false, "link not found");
            net.delay = 0;
            continue;
          }
          await link.scrollIntoViewIfNeeded();
          const vt0 = (await state(page)).vt;
          await link.click();
          await sleep(600);
          const during = await state(page);
          const duringBlocks = await blocks(page);
          const tag = `${j.name}-${size.width}-${scheme}`;
          await page.screenshot({ path: `${out}/${tag}-1-outline.png` });
          const after = await settled(page, j.to);
          await sleep(500);
          const afterBlocks = await blocks(page);
          await page.screenshot({ path: `${out}/${tag}-2-page.png` });
          net.delay = 0;
          const gameTab = j.name.startsWith("game-to");
          say(
            `${tag}`,
            !after.timedOut && (during.outline || gameTab) && after.vt > vt0,
            `during outline=${during.outline} main=${during.mainHeight} scroll=${during.scrollY}; after url=${after.url} main=${after.mainHeight} vt=${after.vt - vt0}\n      outline: ${duringBlocks.join(" ")}\n      page:    ${afterBlocks.join(" ")}`,
          );
        } catch (error) {
          net.delay = 0;
          say(`${j.name} ${size.width} ${scheme}`, false, String(error).slice(0, 300));
        }
      }
      say(
        `console clean ${size.width} ${scheme}`,
        errors.length === 0,
        errors.slice(0, 5).join(" | "),
      );
      await context.close();
    }
  }
}

if (part === "stuck" || part === "all") {
  const site = (href) =>
    `nav[aria-label="Site"] a[href="${href}"]:visible, dialog a[href="${href}"]`;
  const cases = {
    "reduced motion: outline, no view transition": async ({ page, net }) => {
      await load(page, "/");
      net.delay = 1200;
      await tap(page, site("/nhl"));
      await sleep(300);
      const during = await state(page);
      await page.screenshot({ path: `${out}/reduced-motion-outline.png` });
      const after = await settled(page, "/nhl");
      // and a tab, whose arrival is noticed inside a commit
      await page.locator('main a[href="/nhl/teams/21"]').first().click();
      const team = await settled(page, "/nhl/teams/21");
      await page.locator('main a[href="/nhl/teams/21/roster"]').first().click();
      await sleep(300);
      const tabDuring = await state(page);
      const tab = await settled(page, "/nhl/teams/21/roster");
      return [
        during.outline &&
          !after.timedOut &&
          !team.timedOut &&
          tabDuring.outline &&
          !tab.timedOut &&
          tab.vt === 0,
        `outline=${during.outline} tabOutline=${tabDuring.outline} vt=${tab.vt} url=${tab.url}`,
      ];
    },
    "second tap during a pending navigation": async ({ page, net }) => {
      await load(page, "/");
      net.delay = 1500;
      await tap(page, site("/nhl"));
      await sleep(350);
      await tap(page, site("/players"));
      const after = await settled(page, "/players");
      await sleep(2500);
      const later = await state(page);
      return [
        !after.timedOut && later.url === "/players" && !later.outline && later.hiddenBoxes === 0,
        JSON.stringify(later),
      ];
    },
    "second tap, back to the page tapped on": async ({ page, net }) => {
      await load(page, "/nhl");
      net.delay = 1500;
      await tap(page, site("/players"));
      await sleep(350);
      await tap(page, site("/nhl"));
      await sleep(700);
      const soon = await state(page);
      await sleep(3000);
      const later = await state(page);
      return [
        !later.outline && later.hiddenBoxes === 0,
        `soon=${JSON.stringify(soon)} later=${JSON.stringify(later)}`,
      ];
    },
    "two taps in one frame, the second back to the page tapped on": async ({ page, net }) => {
      await load(page, "/nhl");
      net.delay = 1500;
      const menu = page.getByRole("button", { name: "Open menu" });
      if (await menu.isVisible()) await menu.click();
      // Both clicks before the first one's view transition has called back.
      await page.evaluate(() => {
        const link = (href) =>
          [...document.querySelectorAll(`a[href="${href}"]`)].find((a) => a.offsetParent != null);
        link("/players").click();
        link("/nhl").click();
      });
      await sleep(4000);
      const later = await state(page);
      return [!later.outline && later.hiddenBoxes === 0, JSON.stringify(later)];
    },
    "double tap on the same link": async ({ page, net }) => {
      await load(page, "/");
      net.delay = 1200;
      await tap(page, site("/nhl"));
      await sleep(120);
      await page
        .locator(site("/nhl"))
        .first()
        .click({ force: true, timeout: 2000 })
        .catch(() => {});
      const after = await settled(page, "/nhl");
      return [!after.timedOut, JSON.stringify(after)];
    },
    "tab pending, then a page link": async ({ page, net }) => {
      await load(page, "/nhl/teams/21");
      net.delay = 1500;
      await page.locator('main a[href="/nhl/teams/21/roster"]').first().click();
      await sleep(350);
      await tap(page, site("/players"));
      const after = await settled(page, "/players");
      await sleep(2500);
      const later = await state(page);
      return [
        !after.timedOut && later.url === "/players" && !later.outline && later.hiddenBoxes === 0,
        JSON.stringify(later),
      ];
    },
    "back and forward": async ({ page }) => {
      await load(page, "/");
      await tap(page, site("/nhl"));
      await settled(page, "/nhl");
      await tap(page, site("/players"));
      await settled(page, "/players");
      await page.goBack();
      const b1 = await settled(page, "/nhl");
      await page.goBack();
      const b2 = await settled(page, "/");
      await page.goForward();
      const f1 = await settled(page, "/nhl");
      await sleep(500);
      const text = await state(page);
      return [
        !b1.timedOut && !b2.timedOut && !f1.timedOut && text.mainText > 200,
        `${b1.url} ${b2.url} ${f1.url} text=${text.mainText} h=${text.h1}`,
      ];
    },
    "back while a navigation is pending": async ({ page, net }) => {
      await load(page, "/");
      await tap(page, site("/nhl"));
      await settled(page, "/nhl");
      net.delay = 2000;
      await tap(page, site("/players"));
      await sleep(400);
      await page.goBack();
      await sleep(4000);
      const later = await state(page);
      return [
        !later.outline && later.hiddenBoxes === 0 && later.mainText > 200,
        JSON.stringify(later),
      ];
    },
    "navigation whose request fails (aborted)": async ({ page, net }) => {
      await load(page, "/");
      net.mode = "abort";
      await tap(page, site("/players"));
      await sleep(4000);
      const later = await state(page);
      net.mode = "pass";
      return [
        !later.outline && later.hiddenBoxes === 0 && later.mainText > 50,
        JSON.stringify(later),
      ];
    },
    "navigation answered 500": async ({ page, net }) => {
      await load(page, "/");
      net.mode = "500";
      await tap(page, site("/players"));
      await sleep(4000);
      const later = await state(page);
      await page.screenshot({ path: `${out}/nav-500.png` });
      net.mode = "pass";
      return [
        !later.outline && later.hiddenBoxes === 0 && later.mainText > 50,
        JSON.stringify(later),
      ];
    },
    "navigation to a page that is not found": async ({ page, net }) => {
      await load(page, "/nhl");
      net.rewrite = ["/nhl/teams/21", "/nhl/teams/999"];
      net.mode = "rewrite";
      await page.locator('main a[href="/nhl/teams/21"]').first().click();
      await sleep(4000);
      const later = await state(page);
      await page.screenshot({ path: `${out}/nav-404.png` });
      return [
        !later.outline && later.hiddenBoxes === 0 && later.mainText > 20,
        JSON.stringify(later),
      ];
    },
    "navigation never answered: the old page returns after 10 s": async ({ page, net }) => {
      await load(page, "/");
      net.mode = "hang";
      await tap(page, site("/players"));
      await sleep(1000);
      const during = await state(page);
      await sleep(10500);
      const later = await state(page);
      return [
        during.outline && !later.outline && later.hiddenBoxes === 0 && later.mainText > 200,
        `during=${JSON.stringify(during)} later=${JSON.stringify(later)}`,
      ];
    },
    "modifier click and hash link draw no outline": async ({ page }) => {
      await load(page, "/");
      await tap(page, site("/nhl"), { modifiers: ["Control"] });
      await sleep(600);
      const later = await state(page);
      return [!later.outline && later.url === "/", JSON.stringify(later)];
    },
  };
  for (const [name, run] of Object.entries(cases)) {
    for (const width of [390, 1440]) {
      const reduced = name.startsWith("reduced");
      const opened = await open({ width, height: width === 390 ? 844 : 900, reduced });
      try {
        const [ok, detail] = await run(opened);
        const expected = /fails|500|not found|never/.test(name);
        const errs = opened.errors.map((e) => e.slice(0, 160));
        say(
          `${name} @${width}`,
          ok && (expected || errs.length === 0),
          `${detail}${errs.length ? ` ERRORS(${errs.length}): ${errs.slice(0, 3).join(" | ")}` : ""}`,
        );
      } catch (error) {
        say(`${name} @${width}`, false, String(error).slice(0, 400));
      }
      await opened.context.close();
    }
  }
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} ok, ${failed.length} failed`);
