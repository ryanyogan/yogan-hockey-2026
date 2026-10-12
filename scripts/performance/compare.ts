// Two sites measured side by side, against the recorded baseline: joins the many short
// measurements scripts/performance-compare.sh takes (one route, one run, each site in turn) into
// one measurement a site, and writes the three-column tables. Pure; tested in compare.test.ts.
import {
  type Measurement,
  median,
  type NavigationResult,
  type RouteResult,
  type RunNumbers,
  SCRIPT_BUDGETS_KB,
} from "./budgets.ts";

export type Spread = { n: number; min: number; median: number; max: number };

/** The least, middle and greatest of what was measured; null when nothing was. */
export function spread(values: (number | null | undefined)[]): Spread | null {
  const numbers = values.filter((value): value is number => value != null);
  if (numbers.length === 0) return null;
  return {
    n: numbers.length,
    min: Math.min(...numbers),
    median: median(numbers),
    max: Math.max(...numbers),
  };
}

/**
 * Under what the page was answered: "cached" from vinext's page cache, "rendered" for the
 * request, or, on a site that keeps no pages, rendered with its ESPN reads in KV ("kv warm") or
 * not ("kv cold").
 */
export function condition(result: RouteResult): string {
  if (result.mode === "cached") return "cached";
  const said = result.cacheStatus.find((status) => status.startsWith("kv "));
  return said ?? "rendered";
}

/** A result's runs: its own record of each, or, for one taken before #193, its medians as one. */
function runsOf(result: RouteResult): RunNumbers[] {
  if (result.perRun != null) return result.perRun;
  const taps = result.interactions.flatMap((tap) => (tap.ms == null ? [] : [tap.ms]));
  return [
    {
      firstPaintMs: result.firstPaintMs,
      largestPaintMs: result.largestPaintMs,
      hydratedMs: result.hydratedMs,
      pageHydratedMs: result.pageHydratedMs ?? null,
      loadShift: result.loadShift,
      liveShift: result.liveShift,
      slowestTapMs: taps.length === 0 ? null : Math.max(...taps),
      shellMs: result.navigation?.shellMs ?? null,
    },
  ];
}

const middle = (values: (number | null | undefined)[]) => spread(values)?.median ?? null;

/**
 * One measurement of a site from several of it (each of some routes, some runs): a route's runs
 * are put together, a time is their median, a shift and a weight the worst, as one long run of
 * scripts/measure-performance.ts would have it. No run is left out.
 */
export function merge(measurements: Measurement[]): Measurement {
  const first = measurements[0];
  if (first == null) throw new Error("nothing was measured");
  const groups = new Map<string, RouteResult[]>();
  for (const measurement of measurements) {
    for (const result of measurement.results) {
      const key = `${result.route}\n${condition(result)}`;
      groups.set(key, [...(groups.get(key) ?? []), result]);
    }
  }
  const results = [...groups.values()].map((of): RouteResult => {
    const one = of[0] as RouteResult;
    const perRun = of.flatMap(runsOf);
    const worst = <T>(pick: (result: RouteResult) => T, score: (value: T) => number) =>
      of.map(pick).reduce((most, next) => (score(next) > score(most) ? next : most));
    const navigations = of.flatMap((result) => (result.navigation ? [result.navigation] : []));
    const loadShifts = worst(
      (result) => result,
      (result) => result.loadShift,
    );
    const liveShifts = worst(
      (result) => result,
      (result) => result.liveShift ?? -1,
    );
    return {
      ...one,
      cacheStatus: of.flatMap((result) => result.cacheStatus),
      ttfbMs: middle(of.map((result) => result.ttfbMs)) ?? -1,
      firstPaintMs: middle(perRun.map((run) => run.firstPaintMs)) ?? -1,
      largestPaintMs: middle(perRun.map((run) => run.largestPaintMs)) ?? -1,
      largestPaintElement: worst(
        (result) => result,
        (result) => result.largestPaintMs,
      ).largestPaintElement,
      errors: [...new Set(of.flatMap((result) => result.errors ?? []))],
      hydratedMs: middle(perRun.map((run) => run.hydratedMs)),
      pageHydratedMs: middle(perRun.map((run) => run.pageHydratedMs)),
      perRun,
      loadShift: loadShifts.loadShift,
      loadShifts: loadShifts.loadShifts,
      liveShift: liveShifts.liveShift,
      liveShifts: liveShifts.liveShifts,
      interactions: one.interactions.map((tap) => ({
        name: tap.name,
        ms: middle(
          of.map((result) => result.interactions.find((other) => other.name === tap.name)?.ms),
        ),
      })),
      navigation:
        navigations.length === 0
          ? null
          : {
              to: (navigations[0] as NavigationResult).to,
              shellMs: middle(navigations.map((navigation) => navigation.shellMs)),
              contentMs: middle(navigations.map((navigation) => navigation.contentMs)),
              blankFrames: Math.max(...navigations.map((navigation) => navigation.blankFrames)),
              viewTransition: navigations.some((navigation) => navigation.viewTransition),
              requestsAfterTap: Math.max(
                ...navigations.map((navigation) => navigation.requestsAfterTap),
              ),
              documentLoad: navigations.some((navigation) => navigation.documentLoad),
              notFound: navigations.some((navigation) => navigation.notFound === true),
            },
      script: worst(
        (result) => result.script,
        (weight) => weight.gzipBytes,
      ),
      document: worst(
        (result) => result.document,
        (weight) => weight.gzipBytes,
      ),
      stylesheet: worst(
        (result) => result.stylesheet,
        (weight) => weight.gzipBytes,
      ),
    };
  });
  const loads = measurements.flatMap((measurement) =>
    measurement.load ? [measurement.load.before, measurement.load.after] : [],
  );
  const last = measurements.at(-1) as Measurement;
  return {
    ...first,
    measuredAt: `${first.measuredAt} to ${last.measuredAt}`,
    runs: Math.max(...results.map((result) => result.perRun?.length ?? 1)),
    // The lightest and the heaviest minute the runs saw.
    ...(loads.length === 0
      ? {}
      : {
          load: {
            before: [Math.min(...loads.map((load) => load[0] ?? 0))],
            after: [Math.max(...loads.map((load) => load[0] ?? 0))],
          },
        }),
    failures: measurements.flatMap((measurement) => measurement.failures),
    results,
  };
}

const kb = (bytes: number) => (bytes / 1024).toFixed(1);
const row = (cells: string[]) => `| ${cells.join(" | ")} |`;
const table = (head: string[], rows: string[][]) =>
  [row(head), row(head.map(() => "---")), ...rows.map(row)].join("\n");

/** "5420 (5310 to 5630)": the median and, of more than one run, the least and the greatest. */
export function printed(of: Spread | null, digits = 0): string {
  if (of == null) return "n/a";
  const show = (value: number) => value.toFixed(digits);
  return of.n === 1 ? show(of.median) : `${show(of.median)} (${show(of.min)} to ${show(of.max)})`;
}

/** A shift is the worst run, as the budget judges it, with every run beside it. */
function printedShift(values: (number | null)[]): string {
  const numbers = values.filter((value): value is number => value != null);
  if (numbers.length === 0) return "n/a";
  const worst = Math.max(...numbers).toFixed(4);
  return numbers.length === 1 ? worst : `${worst} (${numbers.map((n) => n.toFixed(4)).join(", ")})`;
}

export type Sides = {
  /** The baseline as recorded (docs/performance/results/local.json): vinext, at its commit. */
  baseline: Measurement;
  /** `main` measured now. */
  main: Measurement;
  /** The branch measured now, in the same rounds. */
  branch: Measurement;
};

type Cell = { side: keyof Sides; condition: string; head: string };

/**
 * The columns of every table: each side under each condition it was measured in. The baseline
 * and `main` are vinext, answered from its page cache or rendered; the branch keeps no page and
 * is rendered with its ESPN reads in KV or not.
 */
const CELLS: Cell[] = [
  { side: "baseline", condition: "cached", head: "Baseline, cached" },
  { side: "baseline", condition: "rendered", head: "Baseline, rendered" },
  { side: "main", condition: "cached", head: "`main` today, cached" },
  { side: "main", condition: "rendered", head: "`main` today, rendered" },
  { side: "branch", condition: "kv warm", head: "Branch today, KV warm" },
  { side: "branch", condition: "kv cold", head: "Branch today, KV cold" },
];

const find = (measurement: Measurement, route: string, under: string) =>
  measurement.results.find((result) => result.route === route && condition(result) === under);

/** Every route any side measured, in the branch's order, then whatever only another has. */
function routesOf(sides: Sides): { route: string; path: string }[] {
  const seen = new Map<string, string>();
  for (const side of [sides.branch, sides.main, sides.baseline]) {
    for (const result of side.results) {
      if (!seen.has(result.route)) seen.set(result.route, result.path);
    }
  }
  return [...seen].map(([route, path]) => ({ route, path }));
}

function metricTable(sides: Sides, cell: (result: RouteResult) => string): string {
  return table(
    ["Route", ...CELLS.map((column) => column.head)],
    routesOf(sides).map(({ route, path }) => [
      `\`${path}\``,
      ...CELLS.map((column) => {
        const result = find(sides[column.side], route, column.condition);
        return result == null ? "" : cell(result);
      }),
    ]),
  );
}

const times = (pick: (run: RunNumbers) => number | null) => (result: RouteResult) =>
  printed(spread(runsOf(result).map(pick)));

export type Verdict = {
  route: string;
  path: string;
  /** Gzipped script the branch sent, its budget, and whether it is over. */
  scriptKb: number | null;
  budgetKb: number | null;
  overBudget: boolean;
  /** Every control hydrated: the branch with KV warm, and `main` today at its quicker. */
  branchHydrated: Spread | null;
  mainHydrated: Spread | null;
  /** The branch's median is after `main`'s. */
  later: boolean;
  /** The two ranges overlap: the difference is inside what the runs vary by. */
  overlap: boolean;
};

/** What the ticket asks of each route: its script within budget, hydrated no later than `main` today. */
export function verdicts(sides: Sides): Verdict[] {
  return routesOf(sides).flatMap(({ route, path }) => {
    const branch = find(sides.branch, route, "kv warm") ?? find(sides.branch, route, "rendered");
    if (branch == null) return [];
    const budgetKb = SCRIPT_BUDGETS_KB[route] ?? null;
    const hydrated = (result: RouteResult | undefined) =>
      result == null ? null : spread(runsOf(result).map((run) => run.pageHydratedMs));
    const branchHydrated = hydrated(branch);
    const mains = [
      hydrated(find(sides.main, route, "cached")),
      hydrated(find(sides.main, route, "rendered")),
    ].filter((of): of is Spread => of != null);
    // `main` at its quicker: the harder of the two for the branch to match.
    const mainHydrated = mains.reduce<Spread | null>(
      (quicker, next) => (quicker == null || next.median < quicker.median ? next : quicker),
      null,
    );
    const later =
      branchHydrated != null && mainHydrated != null && branchHydrated.median > mainHydrated.median;
    return [
      {
        route,
        path,
        scriptKb: branch.script.gzipBytes / 1024,
        budgetKb,
        overBudget: budgetKb != null && branch.script.gzipBytes > budgetKb * 1024,
        branchHydrated,
        mainHydrated,
        later,
        overlap:
          branchHydrated != null &&
          mainHydrated != null &&
          branchHydrated.min <= mainHydrated.max &&
          mainHydrated.min <= branchHydrated.max,
      },
    ];
  });
}

const loadOf = (measurement: Measurement) =>
  measurement.load == null
    ? "not recorded"
    : `${measurement.load.before[0]?.toFixed(1)} to ${measurement.load.after[0]?.toFixed(1)}`;

/** The Markdown of the comparison: the misses first, then a table a metric. */
export function comparison(sides: Sides): string {
  const judged = verdicts(sides);
  const over = judged.filter((verdict) => verdict.overBudget);
  const later = judged.filter((verdict) => verdict.later);
  const scripts = table(
    [
      "Route",
      "Budget",
      "Baseline",
      "`main` today",
      "Branch today",
      "Branch script files",
      "Within budget",
    ],
    routesOf(sides).map(({ route, path }) => {
      const sent = (measurement: Measurement) => {
        const results = measurement.results.filter((result) => result.route === route);
        return results.length === 0
          ? ""
          : kb(Math.max(...results.map((result) => result.script.gzipBytes)));
      };
      const verdict = judged.find((one) => one.route === route);
      const branch = sides.branch.results.find((result) => result.route === route);
      return [
        `\`${path}\``,
        SCRIPT_BUDGETS_KB[route] == null ? "none" : String(SCRIPT_BUDGETS_KB[route]),
        sent(sides.baseline),
        sent(sides.main),
        sent(sides.branch),
        branch == null ? "" : String(branch.script.files),
        verdict == null
          ? "not measured"
          : verdict.budgetKb == null
            ? "no budget"
            : verdict.overBudget
              ? "**no** ✗"
              : "yes",
      ];
    }),
  );
  const hydration = table(
    [
      "Route",
      "Baseline, site's mark (cached / rendered)",
      "`main` today, site's mark",
      "`main` today, every control (cached)",
      "`main` today, every control (rendered)",
      "Branch today, shell's mark",
      "Branch today, every control (KV warm)",
      "Branch today, every control (KV cold)",
      "Branch, shell to page",
      "Against `main` today",
    ],
    routesOf(sides).map(({ route, path }) => {
      const of = (side: keyof Sides, under: string) => find(sides[side], route, under);
      const mark = (result: RouteResult | undefined) =>
        result == null ? "" : printed(spread(runsOf(result).map((run) => run.hydratedMs)));
      const page = (result: RouteResult | undefined) =>
        result == null ? "" : printed(spread(runsOf(result).map((run) => run.pageHydratedMs)));
      const warm = of("branch", "kv warm") ?? of("branch", "rendered");
      const gap =
        warm == null
          ? null
          : spread(
              runsOf(warm).map((run) =>
                run.pageHydratedMs == null || run.hydratedMs == null
                  ? null
                  : run.pageHydratedMs - run.hydratedMs,
              ),
            );
      const verdict = judged.find((one) => one.route === route);
      const against =
        verdict?.branchHydrated == null || verdict.mainHydrated == null
          ? "n/a"
          : `${verdict.later ? "**later** ✗" : "no later"} by ${Math.abs(Math.round(verdict.branchHydrated.median - verdict.mainHydrated.median))} ms${verdict.overlap ? ", ranges overlap" : ""}`;
      return [
        `\`${path}\``,
        [of("baseline", "cached"), of("baseline", "rendered")]
          .map((result) => (result == null ? "n/a" : mark(result)))
          .join(" / "),
        mark(of("main", "cached") ?? of("main", "rendered")),
        page(of("main", "cached")),
        page(of("main", "rendered")),
        mark(warm),
        page(warm),
        page(of("branch", "kv cold")),
        printed(gap),
        against,
      ];
    }),
  );
  const list = (of: Verdict[], line: (verdict: Verdict) => string) =>
    of.length === 0
      ? "None."
      : of.map((verdict) => `- \`${verdict.path}\`: ${line(verdict)}`).join("\n");
  return [
    "<!-- Written by scripts/performance/compare-report.ts. Do not edit: measure again. -->",
    [
      `The recorded baseline (${sides.baseline.measuredAt}, ${sides.baseline.machine}) beside two sites measured now, in turn, a route at a time: \`main\` (${sides.main.label ?? ""}, ${sides.main.measuredAt}) and the branch (${sides.branch.label ?? ""}, ${sides.branch.measuredAt}), on ${sides.branch.machine}.`,
      `The machine's one-minute load as the runs began and ended ranged ${loadOf(sides.main)} for \`main\` and ${loadOf(sides.branch)} for the branch.`,
      "A time is the median run with the least and the greatest run in brackets; a shift is the worst run with every run in brackets. No run was left out. The baseline's figures are its recorded medians of three, from another machine.",
    ].join(" "),
    "## Routes over their script budget",
    list(over, (verdict) => `${verdict.scriptKb?.toFixed(1)} kB against ${verdict.budgetKb}`),
    "## Routes that hydrate later than `main` today",
    "Every control hydrated, the branch with KV warm against `main` at its quicker of cached and rendered.",
    list(
      later,
      (verdict) =>
        `${printed(verdict.branchHydrated)} ms against ${printed(verdict.mainHydrated)} ms${verdict.overlap ? " (the ranges overlap)" : ""}`,
    ),
    "## Script, gzipped kB",
    scripts,
    "## Hydration, ms",
    "The site's mark is `__NEXT_HYDRATED_AT` on vinext and `__APP_HYDRATED_AT` on the branch, where it is the shell's. \"Every control\" is the watch of scripts/performance/hydration.ts, the same on both.",
    hydration,
    "## Largest paint, ms",
    metricTable(
      sides,
      times((run) => run.largestPaintMs),
    ),
    "## First paint, ms",
    metricTable(
      sides,
      times((run) => run.firstPaintMs),
    ),
    "## Layout shift on load",
    metricTable(sides, (result) => printedShift(runsOf(result).map((run) => run.loadShift))),
    "## Layout shift as scores arrive",
    metricTable(sides, (result) => printedShift(runsOf(result).map((run) => run.liveShift))),
    "## Slowest tap, ms",
    metricTable(
      sides,
      times((run) => run.slowestTapMs),
    ),
    "## Next page after a tap on a link, ms",
    metricTable(
      sides,
      times((run) => run.shellMs),
    ),
    "## Document, kB (gzipped)",
    metricTable(
      sides,
      (result) => `${kb(result.document.rawBytes)} (${kb(result.document.gzipBytes)})`,
    ),
    "",
  ].join("\n\n");
}
