// Measures every route against the performance budgets of PRD #123, on a throttled mid-range
// phone, and writes the results as JSON and as the Markdown tables of docs/performance/.
//
//   node scripts/measure-performance.ts <base> [--out=docs/performance/results/local]
//        [--runs=3] [--only=<route>,<route>] [--team=21] [--player=4024123]
//        [--goalie=3067313] [--finished-game=401803652] [--scheduled-game=<id>|auto|none]
//        [--search=mar] [--favorites=off]
//
// Use scripts/performance-baseline.sh, which builds and serves the site first. Needs TMPDIR on
// disk (see the build notes). It only reads: every request is a GET or the Scoreboard's socket.
//
// For each route, `runs` times, in a new browser profile with nothing cached:
//   1. Load the page. Record the first byte, the first and largest paint (the browser's own
//      `paint` and `largest-contentful-paint` entries), every `layout-shift` entry until the
//      page has its content, the Scoreboard has spoken and 3 quiet seconds have passed, and the
//      script, document and stylesheet bytes the load asked for.
//   2. Push a changed slate down the page's own Scoreboard socket (one game goes live with a
//      score, one goes final, then a "heard" time), and record the shifts that causes.
//   3. Tap each control and record the slowest event's duration (the browser's Event Timing
//      entries, what INP is made of: from the tap to the next paint).
//   4. In a second new profile, tap a link and watch every frame: when the page first changes
//      (the next shell), when the next page's content is whole, and whether `<main>` was ever empty.
// A page the cache keeps is measured twice: answered from the cache (asked for once beforehand),
// and rendered (`?uncached=<n>`, a query parameter the page does not read, which bypasses it).
// Times are the median run; a shift is the worst run.
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";
import { type Browser, type BrowserContext, chromium, type Page } from "@playwright/test";
import {
  BUDGETS,
  type InteractionResult,
  median,
  type NavigationResult,
  PROFILE,
  type RouteResult,
  report,
  type Shift,
  type Weight,
} from "./performance/budgets.ts";
import {
  FIXTURE_SUBJECTS,
  type Interaction,
  MENU_INTERACTION,
  type MeasuredRoute,
  measuredRoutes,
  SHELL_INTERACTIONS,
} from "./performance/routes.ts";

const args = process.argv.slice(2);
const base = args.find((arg) => !arg.startsWith("--"))?.replace(/\/$/, "");
if (!base) {
  console.error("usage: measure-performance.ts <base> [--out=<path without extension>] [--runs=3]");
  process.exit(1);
}
const flag = (name: string, otherwise: string) =>
  args.findLast((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? otherwise;
const runs = Number(flag("runs", "3"));
if (!Number.isInteger(runs) || runs < 1) {
  console.error(`--runs=${flag("runs", "3")} is not a number of runs`);
  process.exit(1);
}
const out = flag("out", "docs/performance/results/local");
const only = flag("only", "");
const favorites = flag("favorites", "on") !== "off";

const SETTLE_MS = 3000;
const SCOREBOARD_SOCKET = /\/agents\/scoreboard-agent\/main/;

/** Runs before the page's own scripts: collects what the browser reports as it happens. */
const watchPage = () => {
  const seen = {
    shifts: [] as { value: number; atMs: number; nodes: string }[],
    largestPaintMs: 0,
    largestPaintElement: "",
    events: [] as { name: string; startTime: number; duration: number }[],
    viewTransitions: 0,
    navigation: null as null | { startedAt: number; before: string; frames: unknown[] },
  };
  Object.assign(window, { __seen: seen });
  const describe = (node: Node | null | undefined) => {
    if (!(node instanceof Element)) return node?.parentElement ? "text" : "?";
    const slot = node.closest("[data-slot]")?.getAttribute("data-slot");
    const text = (node.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
    return `${node.nodeName.toLowerCase()}${slot ? `[${slot}]` : ""} "${text}"`;
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as unknown as {
      value: number;
      startTime: number;
      hadRecentInput: boolean;
      sources: { node?: Node }[];
    }[]) {
      if (entry.hadRecentInput) continue;
      seen.shifts.push({
        value: entry.value,
        atMs: Math.round(entry.startTime),
        nodes: [...new Set(entry.sources.map((source) => describe(source.node)))].join("; "),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as unknown as {
      startTime: number;
      element?: Element;
    }[]) {
      seen.largestPaintMs = entry.startTime;
      seen.largestPaintElement = describe(entry.element);
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      seen.events.push({ name: entry.name, startTime: entry.startTime, duration: entry.duration });
    }
  }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  const start = document.startViewTransition?.bind(document);
  if (start) {
    document.startViewTransition = ((...given: Parameters<typeof start>) => {
      seen.viewTransitions += 1;
      return start(...given);
    }) as typeof document.startViewTransition;
  }
};

/** True once the page's content is drawn: `<main>` has text and no placeholder is left in it. */
const contentReady = () => {
  const main = document.querySelector("main");
  return (main?.textContent ?? "").trim() !== "" && main?.querySelector("[aria-busy=true]") == null;
};

/** vinext's own mark that the page has hydrated, and when (ms from the navigation's start). */
const hydrated = () =>
  (window as unknown as { __NEXT_HYDRATED?: boolean }).__NEXT_HYDRATED === true;
const hydratedAt = () =>
  (window as unknown as { __NEXT_HYDRATED_AT?: number }).__NEXT_HYDRATED_AT ?? null;

type Slate = { games: Record<string, unknown>[] } & Record<string, unknown>;
type Visit = {
  context: BrowserContext;
  page: Page;
  /** The slate the Scoreboard last sent this page, and a way to send it another. */
  scoreboard: { slate: Slate | null; push: (message: unknown) => void };
  responses: Map<string, { kind: string; raw: number; gzip: number }>;
  rscRequests: () => number;
};

async function visit(browser: Browser): Promise<Visit> {
  const context = await browser.newContext({
    viewport: PROFILE.viewport,
    deviceScaleFactor: PROFILE.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    userAgent: PROFILE.userAgent,
    timezoneId: PROFILE.timezone,
  });
  const page = await context.newPage();
  const devtools = await context.newCDPSession(page);
  await devtools.send("Network.enable");
  await devtools.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: PROFILE.network.latencyMs,
    downloadThroughput: (PROFILE.network.downloadKbps * 1024) / 8,
    uploadThroughput: (PROFILE.network.uploadKbps * 1024) / 8,
  });
  await devtools.send("Emulation.setCPUThrottlingRate", { rate: PROFILE.cpuSlowdown });
  await page.addInitScript(watchPage);
  // A family member has favorites, and they reach the page from localStorage after it hydrates.
  if (favorites) {
    await page.addInitScript(
      ([team, player]) => {
        localStorage.setItem("favorite_teams", JSON.stringify([team]));
        localStorage.setItem("favorite_players", JSON.stringify([player]));
      },
      [subjects.team, subjects.player],
    );
  }

  const scoreboard: Visit["scoreboard"] = { slate: null, push: () => {} };
  await page.routeWebSocket(SCOREBOARD_SOCKET, (socket) => {
    const agent = socket.connectToServer();
    socket.onMessage((message) => agent.send(message));
    agent.onMessage((message) => {
      try {
        const parsed = JSON.parse(String(message));
        if (parsed.type === "cf_agent_state") scoreboard.slate = parsed.state;
      } catch {
        // Not JSON: the Agents SDK's own business.
      }
      socket.send(message);
    });
    scoreboard.push = (message) => socket.send(JSON.stringify(message));
  });

  const responses: Visit["responses"] = new Map();
  let rsc = 0;
  page.on("request", (request) => {
    if (request.headers().rsc === "1") rsc += 1;
  });
  page.on("response", async (response) => {
    const kind = response.request().resourceType();
    if (!["script", "document", "stylesheet"].includes(kind) || responses.has(response.url())) {
      return;
    }
    try {
      const body = await response.body();
      responses.set(response.url(), {
        kind,
        raw: body.length,
        gzip: gzipSync(body, { level: 9 }).length,
      });
    } catch {
      // A redirect, or a page closed under the read: it sent no body to weigh.
    }
  });
  return { context, page, scoreboard, responses, rscRequests: () => rsc };
}

const weigh = (visitor: Visit, kind: string): Weight => {
  const of = [...visitor.responses.values()].filter((response) => response.kind === kind);
  return {
    files: of.length,
    rawBytes: of.reduce((sum, response) => sum + response.raw, 0),
    gzipBytes: of.reduce((sum, response) => sum + response.gzip, 0),
  };
};

/** The slate with its first game gone live with a score and its second gone final. */
function changedSlate(slate: Slate): Slate {
  const side = (game: Record<string, unknown>, which: "home" | "away", more: object) => ({
    ...(game[which] as object),
    ...more,
  });
  return {
    ...slate,
    games: slate.games.map((game, index) =>
      index === 0
        ? {
            ...game,
            status: "live",
            period: 2,
            clock: "12:34",
            detail: "12:34 - 2nd",
            home: side(game, "home", { score: 1 }),
            away: side(game, "away", { score: 2 }),
          }
        : index === 1
          ? {
              ...game,
              status: "final",
              period: 3,
              clock: "0:00",
              detail: "Final",
              home: side(game, "home", { score: 4, winner: true }),
              away: side(game, "away", { score: 1, winner: false }),
            }
          : game,
    ),
  };
}

const totalShift = (shifts: Shift[]) => shifts.reduce((sum, entry) => sum + entry.value, 0);
const readShifts = (page: Page) =>
  page.evaluate(() => (window as unknown as { __seen: { shifts: Shift[] } }).__seen.shifts);
const clearShifts = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { __seen: { shifts: Shift[] } }).__seen.shifts = [];
  });

async function measureInteraction(page: Page, interaction: Interaction): Promise<number | null> {
  const target = page.locator(interaction.selector).filter({ visible: true }).first();
  if ((await target.count()) === 0) return null;
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const from = await page.evaluate(() => performance.now());
  if (interaction.type != null) {
    await target.focus();
    await page.keyboard.type(interaction.type);
  } else {
    await target.tap();
  }
  // An event's entry is delivered after the paint that follows it, slowed four times.
  await page.waitForTimeout(1200);
  return page.evaluate((since) => {
    const { events } = (
      window as unknown as { __seen: { events: { startTime: number; duration: number }[] } }
    ).__seen;
    const after = events.filter((event) => event.startTime >= since);
    // Nothing reported means every event was under the 16 ms the browser reports from.
    return after.length === 0 ? 16 : Math.max(...after.map((event) => event.duration));
  }, from);
}

async function measureNavigation(
  browser: Browser,
  path: string,
  selector: string,
): Promise<NavigationResult | null> {
  const visitor = await visit(browser);
  const { page } = visitor;
  try {
    await page.goto(base + path, { waitUntil: "load", timeout: 90_000 });
    await page.waitForFunction(contentReady, undefined, { timeout: 60_000 });
    // Not before the page has hydrated: until then a tap on a link is a whole document load.
    await page.waitForFunction(hydrated, undefined, { timeout: 60_000 });
    await page.waitForTimeout(SETTLE_MS);
    const link = page.locator(selector).filter({ visible: true }).first();
    if ((await link.count()) === 0) return null;
    const to = (await link.getAttribute("href")) ?? "";
    const toPath = new URL(to, base).pathname;
    await link.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const seen = (window as unknown as { __seen: Record<string, unknown> }).__seen;
      const main = () => document.querySelector("main");
      const drawn = () => {
        const element = main();
        const heading = element?.querySelector("h1, h2")?.textContent ?? "";
        const busy = element?.querySelectorAll("[aria-busy=true]").length ?? 0;
        return `${location.pathname}|${heading}|${busy}|${element?.textContent?.length ?? -1}`;
      };
      const navigation = { startedAt: -1, before: "", frames: [] as unknown[] };
      seen.navigation = navigation;
      document.addEventListener(
        "click",
        () => {
          if (navigation.startedAt >= 0) return;
          navigation.startedAt = performance.now();
          navigation.before = drawn();
          // Outlives the document, for a tap the router does not take.
          sessionStorage.setItem("__tappedAt", String(Date.now()));
        },
        { capture: true },
      );
      let last = "";
      const frame = () => {
        if (navigation.startedAt >= 0) {
          const element = main();
          const now = drawn();
          const blank =
            element == null ||
            (element.textContent ?? "").trim() === "" ||
            element.getBoundingClientRect().height < 40;
          if (now !== last || blank) {
            last = now;
            navigation.frames.push({
              atMs: performance.now() - navigation.startedAt,
              drawn: now,
              blank,
              path: location.pathname,
              ready:
                (element?.textContent ?? "").trim() !== "" &&
                element?.querySelector("[aria-busy=true]") == null,
            });
          }
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    const before = visitor.rscRequests();
    await link.tap();
    await page.waitForURL((url) => url.pathname === toPath, { timeout: 60_000 });
    await page.waitForFunction(contentReady, undefined, { timeout: 60_000 });
    await page.waitForTimeout(1500);
    const seen = await page.evaluate(
      () =>
        (
          window as unknown as {
            __seen: {
              viewTransitions: number;
              navigation: null | {
                before: string;
                frames: {
                  atMs: number;
                  drawn: string;
                  blank: boolean;
                  path: string;
                  ready: boolean;
                }[];
              };
            };
          }
        ).__seen,
    );
    if (seen.navigation == null) {
      // A new document: the router did not take the tap, and every frame watched is gone.
      const painted = await page.evaluate(() => {
        const [paint] = performance.getEntriesByName("first-contentful-paint");
        const tappedAt = Number(sessionStorage.getItem("__tappedAt"));
        return performance.timeOrigin + (paint?.startTime ?? 0) - tappedAt;
      });
      return {
        to,
        shellMs: painted,
        contentMs: null,
        blankFrames: 0,
        viewTransition: false,
        requestsAfterTap: visitor.rscRequests() - before,
        documentLoad: true,
      };
    }
    const { frames, before: drawnBefore } = seen.navigation;
    const shell = frames.find((frame) => frame.drawn !== drawnBefore);
    const content = frames.find(
      (frame) => frame.path === toPath && frame.ready && frame.drawn !== drawnBefore,
    );
    return {
      to,
      shellMs: shell?.atMs ?? null,
      contentMs: content?.atMs ?? null,
      blankFrames: frames.filter((frame) => frame.blank && frame.atMs <= (content?.atMs ?? 1e9))
        .length,
      viewTransition: seen.viewTransitions > 0,
      requestsAfterTap: visitor.rscRequests() - before,
      documentLoad: false,
    };
  } finally {
    await visitor.context.close();
  }
}

type Run = {
  cacheStatus: string;
  ttfbMs: number;
  firstPaintMs: number;
  largestPaintMs: number;
  largestPaintElement: string;
  hydratedMs: number | null;
  loadShifts: Shift[];
  liveShifts: Shift[] | null;
  interactions: InteractionResult[];
  navigation: NavigationResult | null;
  script: Weight;
  document: Weight;
  stylesheet: Weight;
};

async function measureOnce(browser: Browser, route: MeasuredRoute, path: string): Promise<Run> {
  const visitor = await visit(browser);
  const { page, scoreboard } = visitor;
  try {
    const response = await page.goto(base + path, { waitUntil: "load", timeout: 90_000 });
    await page.waitForFunction(contentReady, undefined, { timeout: 60_000 });
    await page.waitForFunction(hydrated, undefined, { timeout: 60_000 });
    const hydratedMs = await page.evaluate(hydratedAt);
    // The Scoreboard's first word is part of the load: a cached page has no slate until then.
    for (let waited = 0; scoreboard.slate == null && waited < 8000; waited += 250) {
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(SETTLE_MS);
    const timing = await page.evaluate(() => {
      const [navigation] = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      const [paint] = performance.getEntriesByName("first-contentful-paint");
      const seen = (
        window as unknown as { __seen: { largestPaintMs: number; largestPaintElement: string } }
      ).__seen;
      return {
        ttfbMs: navigation?.responseStart ?? -1,
        firstPaintMs: paint?.startTime ?? -1,
        largestPaintMs: seen.largestPaintMs,
        largestPaintElement: seen.largestPaintElement,
      };
    });
    // No entry would read as 0 ms and pass every budget.
    if (timing.largestPaintMs <= 0) throw new Error("the browser reported no largest paint");
    const loadShifts = await readShifts(page);
    const weights = {
      script: weigh(visitor, "script"),
      document: weigh(visitor, "document"),
      stylesheet: weigh(visitor, "stylesheet"),
    };

    let liveShifts: Shift[] | null = null;
    if (scoreboard.slate != null && scoreboard.slate.games.length >= 2) {
      await clearShifts(page);
      scoreboard.push({ type: "cf_agent_state", state: changedSlate(scoreboard.slate) });
      await page.waitForTimeout(1500);
      scoreboard.push({ type: "scoreboard_heard", at: new Date().toISOString() });
      await page.waitForTimeout(1500);
      liveShifts = await readShifts(page);
    }

    const interactions: InteractionResult[] = [];
    for (const interaction of [...SHELL_INTERACTIONS, ...route.interactions, MENU_INTERACTION]) {
      interactions.push({
        name: interaction.name,
        ms: await measureInteraction(page, interaction),
      });
    }
    return {
      cacheStatus: response?.headers()["x-page-cache"] ?? "none",
      ...timing,
      hydratedMs,
      loadShifts,
      liveShifts,
      interactions,
      navigation: await measureNavigation(browser, path, route.navigate),
      ...weights,
    };
  } finally {
    await visitor.context.close();
  }
}

function summarize(route: MeasuredRoute, mode: RouteResult["mode"], path: string, all: Run[]) {
  const worst = <T>(of: (run: Run) => T, score: (value: T) => number) =>
    all.map(of).reduce((most, next) => (score(next) > score(most) ? next : most));
  const loadShifts = worst((run) => run.loadShifts, totalShift);
  const live = all.flatMap((run) => (run.liveShifts == null ? [] : [run.liveShifts]));
  const liveShifts =
    live.length === 0 ? null : live.reduce((a, b) => (totalShift(b) > totalShift(a) ? b : a));
  const first = all[0] as Run;
  const navigations = all.flatMap((run) => (run.navigation == null ? [] : [run.navigation]));
  const medianOf = (values: (number | null)[]) => {
    const numbers = values.filter((value): value is number => value != null);
    return numbers.length === 0 ? null : median(numbers);
  };
  const result: RouteResult = {
    route: route.route,
    path,
    mode,
    cacheStatus: all.map((run) => run.cacheStatus),
    ttfbMs: median(all.map((run) => run.ttfbMs)),
    firstPaintMs: median(all.map((run) => run.firstPaintMs)),
    largestPaintMs: median(all.map((run) => run.largestPaintMs)),
    largestPaintElement: worst(
      (run) => run,
      (run) => run.largestPaintMs,
    ).largestPaintElement,
    hydratedMs: medianOf(all.map((run) => run.hydratedMs)),
    loadShift: totalShift(loadShifts),
    loadShifts,
    liveShift: liveShifts == null ? null : totalShift(liveShifts),
    liveShifts: liveShifts ?? [],
    interactions: first.interactions.map((interaction, index) => ({
      name: interaction.name,
      ms: medianOf(all.map((run) => run.interactions[index]?.ms ?? null)),
    })),
    navigation:
      navigations.length === 0
        ? null
        : {
            to: (navigations[0] as NavigationResult).to,
            shellMs: medianOf(navigations.map((navigation) => navigation.shellMs)),
            contentMs: medianOf(navigations.map((navigation) => navigation.contentMs)),
            blankFrames: Math.max(...navigations.map((navigation) => navigation.blankFrames)),
            viewTransition: navigations.some((navigation) => navigation.viewTransition),
            requestsAfterTap: Math.max(
              ...navigations.map((navigation) => navigation.requestsAfterTap),
            ),
            documentLoad: navigations.some((navigation) => navigation.documentLoad),
          },
    script: worst(
      (run) => run.script,
      (weight) => weight.gzipBytes,
    ),
    document: worst(
      (run) => run.document,
      (weight) => weight.gzipBytes,
    ),
    stylesheet: worst(
      (run) => run.stylesheet,
      (weight) => weight.gzipBytes,
    ),
  };
  return result;
}

/** A game on today's slate that has not started, read from the live page of the site itself. */
async function upcomingGame(browser: Browser): Promise<string | null> {
  const page = await browser.newPage();
  try {
    await page.goto(`${base}/nhl/live`, { waitUntil: "networkidle" });
    const link = page.getByRole("region", { name: "Upcoming" }).locator('a[href^="/nhl/games/"]');
    if ((await link.count()) === 0) return null;
    return ((await link.first().getAttribute("href")) ?? "").split("/").pop() ?? null;
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch();
const scheduled = flag("scheduled-game", FIXTURE_SUBJECTS.scheduledGame ?? "none");
const subjects = {
  team: flag("team", FIXTURE_SUBJECTS.team),
  player: flag("player", FIXTURE_SUBJECTS.player),
  goalie: flag("goalie", FIXTURE_SUBJECTS.goalie),
  finishedGame: flag("finished-game", FIXTURE_SUBJECTS.finishedGame),
  scheduledGame:
    scheduled === "none" ? null : scheduled === "auto" ? await upcomingGame(browser) : scheduled,
  search: flag("search", FIXTURE_SUBJECTS.search),
};
const every = measuredRoutes(subjects);
const routes = every.filter((route) => only === "" || only.split(",").includes(route.route));
if (routes.length === 0) {
  // Before anything is written: an empty run would replace the results at `out` with nothing.
  console.error(
    `--only=${only} names no route. The routes: ${every.map((route) => route.route).join(", ")}`,
  );
  await browser.close();
  process.exit(1);
}
const results: RouteResult[] = [];
const failures: { route: string; mode: string; error: string }[] = [];

for (const route of routes) {
  const modes: RouteResult["mode"][] = route.cacheable ? ["cached", "rendered"] : ["rendered"];
  for (const mode of modes) {
    // Asked for once beforehand, so the measured answers come from the cache.
    if (mode === "cached") {
      for (let asked = 0; asked < 3; asked++) {
        const warm = await fetch(base + route.path, {
          headers: { "user-agent": PROFILE.userAgent },
        });
        await warm.arrayBuffer();
        if (["hit", "stale"].includes(warm.headers.get("x-page-cache") ?? "")) break;
      }
    }
    const all: Run[] = [];
    let path = route.path;
    try {
      for (let run = 0; run < runs; run++) {
        // A parameter no page reads: the Worker renders the request and keeps nothing.
        if (mode === "rendered" && route.cacheable) {
          path = `${route.path}${route.path.includes("?") ? "&" : "?"}uncached=${run + 1}`;
        }
        all.push(await measureOnce(browser, route, path));
      }
    } catch (error) {
      // One route that cannot be measured is reported, and does not cost the others their hour.
      failures.push({ route: route.route, mode, error: String(error).split("\n")[0] ?? "" });
      console.error(`${route.route} ${mode} FAILED: ${error}`);
      continue;
    }
    const result = summarize(route, mode, mode === "rendered" ? route.path : path, all);
    results.push(result);
    console.error(
      `${result.route} ${mode} [${result.cacheStatus.join(",")}] largest paint ${Math.round(result.largestPaintMs)} ms, shift ${result.loadShift.toFixed(4)} / ${result.liveShift?.toFixed(4) ?? "n/a"}, shell ${result.navigation?.shellMs == null ? "n/a" : Math.round(result.navigation.shellMs)} ms, script ${(result.script.gzipBytes / 1024).toFixed(1)} kB`,
    );
  }
}
const chromiumVersion = browser.version();
await browser.close();

const measurement = {
  base,
  measuredAt: new Date().toISOString(),
  runs,
  profile: PROFILE,
  budgets: BUDGETS,
  machine: `${cpus()[0]?.model ?? "unknown"} x ${cpus().length}, ${process.platform}`,
  chromium: chromiumVersion,
  subjects,
  failures,
  results,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(`${out}.json`, `${JSON.stringify(measurement, null, 1)}\n`);
writeFileSync(`${out}.md`, report(measurement));
console.error(`wrote ${out}.json and ${out}.md`);
if (failures.length > 0) process.exit(1);
