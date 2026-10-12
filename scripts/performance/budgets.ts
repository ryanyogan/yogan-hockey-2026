// The performance budgets of PRD #123 and how a measured route is judged against them.
// Pure: `scripts/measure-performance.ts` does the measuring, this says what the numbers mean and
// writes them as the tables in docs/performance/. Tested in budgets.test.ts.

/** The fixed budgets (PRD #123, "Performance"). Times are milliseconds on the throttled profile. */
export const BUDGETS = {
  /**
   * "Zero layout shift". The browser scores a shift as a fraction of the viewport and reports
   * scores far below anything a visitor can see (0.00008 for a clock changing width), so zero is
   * a score that rounds to 0.000, the three places Lighthouse prints.
   */
  layoutShiftBelow: 0.0005,
  /** Largest paint of a page answered from the page cache. */
  largestPaintCachedMs: 1500,
  /** Largest paint of a page the Worker rendered for the request. */
  largestPaintRenderedMs: 2500,
  /** From a tap to the next frame painted. */
  interactionMs: 200,
  /**
   * "The next page's shell at once": the first frame that differs after a tap on a link. The
   * PRD gives no number; a tap is an interaction, so it gets the interaction budget.
   */
  shellMs: 200,
} as const;

/**
 * The throttled mid-range phone: Lighthouse's mobile profile, applied by DevTools throttling
 * (`constants.throttling.mobileSlow4G` and `screenEmulationMetrics.mobile` in Lighthouse 12).
 */
export const PROFILE = {
  name: "Lighthouse mobile: Moto G Power, 4x CPU slowdown, Slow 4G",
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 1.75,
  userAgent:
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  cpuSlowdown: 4,
  /** 150 ms round trip, 1.6 Mbps down, 750 Kbps up, each times DevTools' request-level factor. */
  network: { latencyMs: 562.5, downloadKbps: 1474.56, uploadKbps: 675 },
  /** Not Eastern, so every time the server wrote as "ET" is replaced when the page hydrates. */
  timezone: "America/Chicago",
} as const;

/**
 * The script-size budget of each route (`MeasuredRoute.route`), in gzipped kB: what the route
 * sent in the baseline of #126 (docs/performance/results/local.json), rounded up by
 * `scriptBudgetKb`. A route that sends more has missed until its number is changed here on
 * purpose; budgets.test.ts holds these to the recorded baseline.
 */
export const SCRIPT_BUDGETS_KB: Record<string, number> = {
  "/": 252,
  "/nhl": 244,
  "/nhl?tab=teams": 244,
  "/nhl/live": 247,
  "/nhl/teams/:id": 249,
  "/nhl/teams/:id/roster": 249,
  "/nhl/teams/:id/stats": 249,
  "/nhl/games/:id (finished)": 253,
  "/nhl/games/:id/scoring": 253,
  "/nhl/games/:id/pick": 253,
  "/nhl/games/:id (scheduled)": 253,
  "/players": 251,
  "/players?q=": 251,
  "/players/:id (skater)": 245,
  "/players/:id/games": 245,
  "/players/:id (goalie)": 245,
};

export type Shift = { value: number; atMs: number; nodes: string };

export type InteractionResult = { name: string; ms: number | null };

export type NavigationResult = {
  to: string;
  /** Tap to the first frame that differs from the page tapped on. */
  shellMs: number | null;
  /** Tap to the next page's content, no placeholder left. */
  contentMs: number | null;
  /** Frames between the tap and the content in which `<main>` was empty. */
  blankFrames: number;
  /** Whether the navigation ran `document.startViewTransition`. */
  viewTransition: boolean;
  /** Requests for the next page made after the tap: 0 means a prefetch answered it. */
  requestsAfterTap: number;
  /** The tap loaded a whole new document: the router did not take it. */
  documentLoad: boolean;
  /** The page arrived at was the not-found page: the link led nowhere, and its time means nothing. */
  notFound?: boolean;
};

/** One run's own numbers, kept so that a spread can be reported and not only a median. */
export type RunNumbers = {
  firstPaintMs: number;
  largestPaintMs: number;
  hydratedMs: number | null;
  pageHydratedMs: number | null;
  loadShift: number;
  liveShift: number | null;
  slowestTapMs: number | null;
  shellMs: number | null;
};

export type Weight = { files: number; rawBytes: number; gzipBytes: number };

export type RouteResult = {
  route: string;
  path: string;
  /** `cached`: answered from the page cache. `rendered`: rendered by the Worker for this request. */
  mode: "cached" | "rendered";
  /**
   * `x-page-cache` of each run's document, or "none" for a route with no cache policy. For a site
   * with no page cache, "kv warm" or "kv cold" when the run said which (`--kv`).
   */
  cacheStatus: string[];
  ttfbMs: number;
  firstPaintMs: number;
  largestPaintMs: number;
  largestPaintElement: string;
  /**
   * The site's own mark of hydration: vinext's `__NEXT_HYDRATED_AT`, or the TanStack Start site's
   * `__APP_HYDRATED_AT`, which is its shell's. Before it a tap on a link loads a whole document.
   */
  hydratedMs: number | null;
  /**
   * When every control drawn was React's (scripts/performance/hydration.ts): the same question
   * on any site. Absent from measurements taken before #193, which have only the site's mark.
   */
  pageHydratedMs?: number | null;
  /** What the page logged as an error or threw, in any run. Absent before #193. */
  errors?: string[];
  /** Each run's own numbers. Absent from measurements taken before #193. */
  perRun?: RunNumbers[];
  /** The worst run's shift from the first byte until the page is settled, and what moved. */
  loadShift: number;
  loadShifts: Shift[];
  /** The worst run's shift as the Scoreboard pushes a changed slate, or null with no slate. */
  liveShift: number | null;
  liveShifts: Shift[];
  interactions: InteractionResult[];
  navigation: NavigationResult | null;
  script: Weight;
  document: Weight;
  stylesheet: Weight;
};

export type Verdict = "pass" | "miss" | "not measured";

export type Judgement = {
  loadShift: Verdict;
  liveShift: Verdict;
  largestPaint: Verdict;
  largestPaintBudgetMs: number;
  interaction: Verdict;
  worstInteraction: InteractionResult | null;
  navigation: Verdict;
  /** Against `SCRIPT_BUDGETS_KB`; a route with no budget yet is not judged. */
  script: Verdict;
  scriptBudgetKb: number | null;
};

export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

const within = (value: number | null, limit: number): Verdict =>
  value == null ? "not measured" : value < limit ? "pass" : "miss";

/** A route's numbers against each budget. */
export function judge(result: RouteResult): Judgement {
  const largestPaintBudgetMs =
    result.mode === "cached" ? BUDGETS.largestPaintCachedMs : BUDGETS.largestPaintRenderedMs;
  const measured = result.interactions.filter((interaction) => interaction.ms != null);
  const worstInteraction = measured.reduce<InteractionResult | null>(
    (worst, next) => (worst == null || (next.ms ?? 0) > (worst.ms ?? 0) ? next : worst),
    null,
  );
  const navigation = result.navigation;
  const scriptBudget = SCRIPT_BUDGETS_KB[result.route] ?? null;
  return {
    script:
      scriptBudget == null
        ? "not measured"
        : result.script.gzipBytes <= scriptBudget * 1024
          ? "pass"
          : "miss",
    scriptBudgetKb: scriptBudget,
    loadShift: within(result.loadShift, BUDGETS.layoutShiftBelow),
    liveShift: within(result.liveShift, BUDGETS.layoutShiftBelow),
    largestPaint: within(result.largestPaintMs, largestPaintBudgetMs),
    largestPaintBudgetMs,
    interaction: within(worstInteraction?.ms ?? null, BUDGETS.interactionMs),
    worstInteraction,
    navigation:
      navigation == null || navigation.shellMs == null
        ? "not measured"
        : navigation.shellMs < BUDGETS.shellMs &&
            navigation.blankFrames === 0 &&
            !navigation.documentLoad &&
            navigation.notFound !== true
          ? "pass"
          : "miss",
  };
}

/**
 * The script-size budget a measurement sets: the gzipped script the route sent, rounded up to
 * the next whole kB. It is how `SCRIPT_BUDGETS_KB` was set, and what a route not yet in it gets.
 */
export function scriptBudgetKb(gzipBytes: number): number {
  return Math.ceil(gzipBytes / 1024);
}

const kb = (bytes: number) => (bytes / 1024).toFixed(1);
const ms = (value: number | null) => (value == null ? "n/a" : String(Math.round(value)));
const shift = (value: number | null) => (value == null ? "n/a" : value.toFixed(4));
const marked = (text: string, verdict: Verdict) => (verdict === "miss" ? `**${text}** ✗` : text);
const row = (cells: string[]) => `| ${cells.join(" | ")} |`;

function table(head: string[], rows: string[][]): string {
  return [row(head), row(head.map(() => "---")), ...rows.map(row)].join("\n");
}

const named = (result: RouteResult) => `\`${result.path}\``;

/** Every route against every budget: one row a route and mode, a miss in bold with a cross. */
export function budgetTable(results: RouteResult[]): string {
  return table(
    [
      "Route",
      "Page",
      "First paint ms",
      "Largest paint ms (budget)",
      "Shift on load",
      "Shift as scores arrive",
      "Slowest tap ms",
      "Next shell ms",
      "Blank frames",
      "View transition",
      "Script gzip kB",
    ],
    results.map((result) => {
      const verdict = judge(result);
      const navigation = result.navigation;
      return [
        named(result),
        `${result.mode} (${[...new Set(result.cacheStatus)].join(", ")})`,
        ms(result.firstPaintMs),
        `${marked(ms(result.largestPaintMs), verdict.largestPaint)} (${verdict.largestPaintBudgetMs})`,
        marked(shift(result.loadShift), verdict.loadShift),
        marked(shift(result.liveShift), verdict.liveShift),
        verdict.worstInteraction == null
          ? "n/a"
          : `${marked(ms(verdict.worstInteraction.ms), verdict.interaction)} (${verdict.worstInteraction.name})`,
        navigation == null ? "n/a" : marked(ms(navigation.shellMs), verdict.navigation),
        navigation == null ? "n/a" : String(navigation.blankFrames),
        navigation == null ? "n/a" : navigation.viewTransition ? "yes" : "no",
        marked(kb(result.script.gzipBytes), verdict.script),
      ];
    }),
  );
}

/** What each route sent against its script budget. One row a route: the larger mode. */
export function weightTable(results: RouteResult[]): string {
  const heaviest = new Map<string, RouteResult>();
  for (const result of results) {
    const seen = heaviest.get(result.route);
    if (seen == null || result.script.gzipBytes > seen.script.gzipBytes) {
      heaviest.set(result.route, result);
    }
  }
  return table(
    [
      "Route",
      "Script files",
      "Script kB",
      "Script gzip kB",
      "**Script budget, gzip kB**",
      "Document kB",
      "Document gzip kB",
      "Stylesheet gzip kB",
    ],
    [...heaviest.values()].map((result) => [
      named(result),
      String(result.script.files),
      kb(result.script.rawBytes),
      marked(kb(result.script.gzipBytes), judge(result).script),
      `**${SCRIPT_BUDGETS_KB[result.route] ?? scriptBudgetKb(result.script.gzipBytes)}**`,
      kb(result.document.rawBytes),
      kb(result.document.gzipBytes),
      kb(result.stylesheet.gzipBytes),
    ]),
  );
}

/** Each tap measured, each navigation, and every node that moved: the detail behind a miss. */
export function detailTables(results: RouteResult[]): string {
  const taps = table(
    ["Route", "Page", "Tap", "ms to next paint"],
    results.flatMap((result) =>
      result.interactions.map((interaction) => [
        named(result),
        result.mode,
        interaction.name,
        marked(ms(interaction.ms), within(interaction.ms, BUDGETS.interactionMs)),
      ]),
    ),
  );
  // A measurement taken before #193 has neither the watch's hydration nor where a navigation
  // arrived, and is printed as it was then: the recorded baseline's tables do not change.
  const watched = results.some((result) => result.pageHydratedMs !== undefined);
  const arrivals = results.some((result) => result.navigation?.notFound !== undefined);
  const navigations = table(
    [
      "From",
      "Page",
      "To",
      "Shell ms",
      "Content ms",
      "Blank frames",
      "Requests after the tap",
      "Whole document loaded",
      ...(arrivals ? ["Arrived at not-found"] : []),
    ],
    results.flatMap((result) =>
      result.navigation == null
        ? []
        : [
            [
              named(result),
              result.mode,
              `\`${result.navigation.to}\``,
              ms(result.navigation.shellMs),
              ms(result.navigation.contentMs),
              String(result.navigation.blankFrames),
              String(result.navigation.requestsAfterTap),
              result.navigation.documentLoad ? "**yes** ✗" : "no",
              ...(arrivals ? [result.navigation.notFound === true ? "**yes** ✗" : "no"] : []),
            ],
          ],
    ),
  );
  const moved = (when: string, result: RouteResult, shifts: Shift[]) =>
    shifts.map((entry) => [
      named(result),
      result.mode,
      when,
      entry.value.toFixed(4),
      String(entry.atMs),
      entry.nodes,
    ]);
  const shifts = table(
    ["Route", "Page", "When", "Score", "At ms", "What moved"],
    results.flatMap((result) => [
      ...moved("load", result, result.loadShifts),
      ...moved("scores arrive", result, result.liveShifts),
    ]),
  );
  const paints = table(
    [
      "Route",
      "Page",
      "First paint ms",
      "Largest paint ms",
      ...(watched
        ? ["Site's own hydration mark ms", "Every control hydrated ms"]
        : ["Taps work from ms"]),
      "The largest element",
    ],
    results.map((result) => [
      named(result),
      result.mode,
      ms(result.firstPaintMs),
      ms(result.largestPaintMs),
      ms(result.hydratedMs),
      ...(watched ? [ms(result.pageHydratedMs ?? null)] : []),
      result.largestPaintElement,
    ]),
  );
  const said = results.flatMap((result) =>
    (result.errors ?? []).map((error) => [
      named(result),
      result.mode,
      error.replace(/\s+/g, " ").replaceAll("|", "\\|"),
    ]),
  );
  return [
    ...(said.length === 0
      ? []
      : ["### Errors the pages logged", table(["Route", "Page", "Error"], said)]),
    "### Every tap",
    taps,
    "### Every navigation",
    navigations,
    "### Every layout shift",
    shifts,
    "### Paint and hydration",
    paints,
  ].join("\n\n");
}

export type Measurement = {
  base: string;
  measuredAt: string;
  runs: number;
  machine: string;
  /** The machine's 1, 5 and 15 minute load averages as the run began and ended. */
  load?: { before: number[]; after: number[] };
  /** Whatever the run was told to call itself: the commit measured, say. */
  label?: string;
  failures: { route: string; mode: string; error: string }[];
  results: RouteResult[];
};

/** The Markdown beside a measurement's JSON: every table, and what could not be measured. */
export function report(measurement: Measurement): string {
  const { base, failures, results } = measurement;
  return [
    `<!-- Written by scripts/measure-performance.ts. Do not edit: measure again. -->`,
    `Measured ${measurement.measuredAt} against \`${base}\`${measurement.label ? ` (${measurement.label})` : ""}, ${measurement.runs} runs a route, on ${measurement.machine}${measurement.load ? `, its load ${measurement.load.before[0]?.toFixed(1)} as the run began and ${measurement.load.after[0]?.toFixed(1)} as it ended` : ""}.`,
    ...(failures.length === 0
      ? []
      : [
          `**Not measured**: ${failures.map((failure) => `\`${failure.route}\` ${failure.mode} (${failure.error})`).join("; ")}.`,
        ]),
    "## Every route against every budget",
    budgetTable(results),
    "## What each route sends",
    weightTable(results),
    "## Detail",
    detailTables(results),
    "",
  ].join("\n\n");
}
