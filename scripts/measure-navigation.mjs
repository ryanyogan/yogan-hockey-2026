// Measures what a visitor waits for on one page: a first load, and a click from a list.
// Usage: node scripts/measure-navigation.mjs <base> <from> <to> [runs] [slow-ms]
//   node scripts/measure-navigation.mjs http://localhost:5294 "/nhl?tab=teams" /nhl/teams/21
// Prints JSON. For the first load of <to>: time to first byte, first contentful paint and the
// layout shift (the browser's own layout-shift entries, summed). For the click: the pointer
// rests on the link to <to> on <from> for 300ms (long enough for a hover prefetch), then
// clicks; "click to content" is from the click until <main> holds a heading and a table and
// nothing in it is `aria-busy`, and the requests the click itself caused are counted.
// [slow-ms] delays every answer from the server by that long, to stand in for a network:
// against localhost nothing else shows the difference between a prefetched page and a fetched one.
import { chromium } from "@playwright/test";

const [base, from, to, runs = "5", slow = "0"] = process.argv.slice(2);
if (!base || !from || !to) {
  console.error("usage: measure-navigation.mjs <base> <from> <to> [runs] [slow-ms]");
  process.exit(1);
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10;
};

/** Collects layout shifts not caused by input, from before the page's first byte. */
const watchShifts = () => {
  window.__shift = 0;
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__shift += entry.value;
      window.__shifts.push({
        value: entry.value,
        at: Math.round(entry.startTime),
        nodes: entry.sources
          .map((source) => `${source.node?.nodeName ?? "?"}.${source.node?.dataset?.slot ?? ""}`)
          .join(","),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
};

/** True once the page's content is drawn: a heading, a table, and no placeholder left. */
const contentReady = () => {
  const main = document.querySelector("main");
  return (
    main != null &&
    main.querySelector("h1, h2") != null &&
    main.querySelector("tbody tr") != null &&
    main.querySelector("[aria-busy=true]") == null
  );
};

const browser = await chromium.launch();

async function newPage() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // The router prefetches nothing for a crawler, and headless Chromium says it is one.
    userAgent: (
      await browser
        .newContext()
        .then((c) => c.newPage())
        .then((p) => p.evaluate(() => navigator.userAgent))
    ).replace("HeadlessChrome", "Chrome"),
  });
  const page = await context.newPage();
  await page.addInitScript(watchShifts);
  if (Number(slow) > 0) {
    await page.route(
      (url) => !url.pathname.startsWith("/agents/"),
      async (route) => {
        await new Promise((done) => setTimeout(done, Number(slow)));
        await route.continue();
      },
    );
  }
  return { context, page };
}

const load = { ttfb: [], fcp: [], ready: [], shift: [] };
const click = { toContent: [], shift: [], documents: [], rsc: [], rscAfterClick: [] };
let shiftsSeen = [];
let loadShiftsSeen = [];

for (let run = 0; run < Number(runs); run++) {
  // A first load of the page.
  {
    const { context, page } = await newPage();
    await page.goto(base + to, { waitUntil: "commit" });
    await page.waitForFunction(contentReady);
    await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType("navigation");
      const [fcp] = performance.getEntriesByName("first-contentful-paint");
      return {
        ttfb: nav.responseStart,
        fcp: fcp?.startTime ?? -1,
        shift: window.__shift,
        shifts: window.__shifts,
      };
    });
    load.ttfb.push(seen.ttfb);
    load.fcp.push(seen.fcp);
    load.shift.push(seen.shift);
    loadShiftsSeen = seen.shifts;
    await context.close();
  }
  // A click from the list.
  {
    const { context, page } = await newPage();
    await page.goto(base + from, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const link = page.locator(`main a[href="${to}"]`).first();
    let documents = 0;
    let rsc = 0;
    let rscAfterClick = 0;
    let clicked = false;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (request.resourceType() === "document") documents++;
      if (request.headers().rsc === "1" && url.pathname.startsWith(to.split("?")[0])) {
        rsc++;
        if (clicked) rscAfterClick++;
      }
    });
    await page.evaluate(() => {
      window.__shift = 0;
      window.__shifts = [];
    });
    await link.hover();
    await page.waitForTimeout(300 + Number(slow) * 2);
    clicked = true;
    const started = Date.now();
    await link.click();
    await page.waitForURL((url) => url.pathname === to.split("?")[0]);
    await page.waitForFunction(contentReady);
    click.toContent.push(Date.now() - started);
    await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => ({ shift: window.__shift, shifts: window.__shifts }));
    click.shift.push(seen.shift);
    shiftsSeen = seen.shifts;
    click.documents.push(documents);
    click.rsc.push(rsc);
    click.rscAfterClick.push(rscAfterClick);
    await context.close();
  }
}
await browser.close();

console.log(
  JSON.stringify(
    {
      to,
      from,
      runs: Number(runs),
      slowMs: Number(slow),
      firstLoad: {
        ttfbMs: median(load.ttfb),
        firstContentfulPaintMs: median(load.fcp),
        layoutShift: Math.max(...load.shift),
        lastRunShifts: loadShiftsSeen,
      },
      click: {
        clickToContentMs: median(click.toContent),
        layoutShift: Math.max(...click.shift),
        documentRequests: Math.max(...click.documents),
        rscRequestsForThePage: median(click.rsc),
        rscRequestsAfterTheClick: Math.max(...click.rscAfterClick),
        lastRunShifts: shiftsSeen,
      },
    },
    null,
    1,
  ),
);
