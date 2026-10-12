import { describe, expect, it } from "vitest";
import type { Measurement, RouteResult, RunNumbers } from "./budgets.ts";
import { comparison, condition, merge, printed, spread, verdicts } from "./compare.ts";

const run = (changes: Partial<RunNumbers> = {}): RunNumbers => ({
  firstPaintMs: 1500,
  largestPaintMs: 1600,
  hydratedMs: 4000,
  pageHydratedMs: 4100,
  loadShift: 0,
  liveShift: 0,
  slowestTapMs: 64,
  shellMs: 700,
  ...changes,
});

/** One run of `/nhl`, as scripts/measure-performance.ts writes it with `--runs=1`. */
const result = (of: Partial<RunNumbers> = {}, changes: Partial<RouteResult> = {}): RouteResult => {
  const numbers = run(of);
  return {
    route: "/nhl",
    path: "/nhl",
    mode: "rendered",
    cacheStatus: ["none"],
    ttfbMs: 20,
    firstPaintMs: numbers.firstPaintMs,
    largestPaintMs: numbers.largestPaintMs,
    largestPaintElement: "h1",
    hydratedMs: numbers.hydratedMs,
    pageHydratedMs: numbers.pageHydratedMs,
    perRun: [numbers],
    loadShift: numbers.loadShift,
    loadShifts: numbers.loadShift === 0 ? [] : [{ value: numbers.loadShift, atMs: 1, nodes: "li" }],
    liveShift: numbers.liveShift,
    liveShifts: [],
    interactions: [{ name: "theme toggle", ms: numbers.slowestTapMs }],
    navigation: null,
    script: { files: 2, rawBytes: 600_000, gzipBytes: 190 * 1024 },
    document: { files: 1, rawBytes: 100_000, gzipBytes: 10_000 },
    stylesheet: { files: 1, rawBytes: 60_000, gzipBytes: 11_000 },
    ...changes,
  };
};

const measurement = (results: RouteResult[], changes: Partial<Measurement> = {}): Measurement => ({
  base: "http://localhost:1",
  measuredAt: "2026-10-12T18:00:00.000Z",
  runs: 1,
  machine: "a machine",
  load: { before: [3, 3, 3], after: [4, 4, 4] },
  failures: [],
  results,
  ...changes,
});

const warm = { cacheStatus: ["kv warm"] };

describe("spread", () => {
  it("is the least, the middle and the greatest, leaving out what was not measured", () => {
    expect(spread([5, null, 1, 9, undefined])).toEqual({ n: 3, min: 1, median: 5, max: 9 });
    expect(spread([null])).toBeNull();
  });

  it("prints one run bare and several with their range", () => {
    expect(printed(spread([4100]))).toBe("4100");
    expect(printed(spread([4100.4, 3900, 4500]))).toBe("4100 (3900 to 4500)");
    expect(printed(null)).toBe("n/a");
  });
});

describe("condition", () => {
  it("tells a cached page, a rendered one, and a rendered one by what KV held", () => {
    expect(condition(result({}, { mode: "cached", cacheStatus: ["hit"] }))).toBe("cached");
    expect(condition(result({}, { cacheStatus: ["bypass"] }))).toBe("rendered");
    expect(condition(result({}, { cacheStatus: ["kv cold"] }))).toBe("kv cold");
  });
});

describe("merge", () => {
  it("puts a route's runs from every round together and drops none", () => {
    const merged = merge([
      measurement([result({ pageHydratedMs: 4100 })]),
      measurement([result({ pageHydratedMs: 9000 })]),
      measurement([result({ pageHydratedMs: 3900 })]),
    ]);
    expect(merged.results).toHaveLength(1);
    expect(merged.results[0]?.perRun?.map((one) => one.pageHydratedMs)).toEqual([4100, 9000, 3900]);
    expect(merged.results[0]?.pageHydratedMs).toBe(4100);
    expect(merged.runs).toBe(3);
  });

  it("keeps the worst run's shift, and what moved in it", () => {
    const merged = merge([
      measurement([result()]),
      measurement([result({ loadShift: 0.0031 })]),
      measurement([result()]),
    ]);
    expect(merged.results[0]?.loadShift).toBe(0.0031);
    expect(merged.results[0]?.loadShifts).toHaveLength(1);
  });

  it("keeps a route's conditions apart", () => {
    const merged = merge([
      measurement([result({}, warm), result({}, { cacheStatus: ["kv cold"] })]),
      measurement([result({}, warm)]),
    ]);
    expect(merged.results.map((one) => [condition(one), one.perRun?.length])).toEqual([
      ["kv warm", 2],
      ["kv cold", 1],
    ]);
  });

  it("says the lightest and the heaviest load any run saw", () => {
    const merged = merge([
      measurement([result()], { load: { before: [2.5], after: [3] } }),
      measurement([result()], { load: { before: [7.25], after: [6] } }),
    ]);
    expect(merged.load).toEqual({ before: [2.5], after: [7.25] });
  });

  it("keeps every failure", () => {
    const failure = { route: "/nhl", mode: "rendered", error: "timed out" };
    expect(merge([measurement([]), measurement([], { failures: [failure] })]).failures).toEqual([
      failure,
    ]);
  });
});

describe("verdicts", () => {
  const sides = (branch: RouteResult[], main: RouteResult[]) => ({
    baseline: measurement([]),
    main: merge(main.map((one) => measurement([one]))),
    branch: merge(branch.map((one) => measurement([one]))),
  });

  it("calls a route later when its median is after main's, at main's quicker condition", () => {
    const [verdict] = verdicts(
      sides(
        [result({ pageHydratedMs: 4300 }, warm)],
        [
          result({ pageHydratedMs: 4200 }, { mode: "cached", cacheStatus: ["hit"] }),
          result({ pageHydratedMs: 4600 }, { cacheStatus: ["bypass"] }),
        ],
      ),
    );
    expect(verdict).toMatchObject({ later: true, overlap: false });
    expect(verdict?.mainHydrated?.median).toBe(4200);
  });

  it("says when the two ranges overlap, and still says which median is later", () => {
    const [verdict] = verdicts(
      sides(
        [4000, 4300, 4900].map((ms) => result({ pageHydratedMs: ms }, warm)),
        [4100, 4200, 4400].map((ms) => result({ pageHydratedMs: ms })),
      ),
    );
    expect(verdict).toMatchObject({ later: true, overlap: true });
  });

  it("does not call an earlier route later", () => {
    const [verdict] = verdicts(
      sides([result({ pageHydratedMs: 3000 }, warm)], [result({ pageHydratedMs: 4100 })]),
    );
    expect(verdict).toMatchObject({ later: false, overBudget: false, budgetKb: 244 });
  });

  it("judges the script against the route's budget", () => {
    const heavy = { ...warm, script: { files: 2, rawBytes: 1, gzipBytes: 244 * 1024 + 1 } };
    expect(verdicts(sides([result({}, heavy)], [result()]))[0]?.overBudget).toBe(true);
  });
});

describe("comparison", () => {
  it("lists the misses first and prints a range for every time", () => {
    const text = comparison({
      baseline: measurement([result({ hydratedMs: 6000 }, { perRun: undefined })]),
      main: merge([4100, 4200, 4400].map((ms) => measurement([result({ pageHydratedMs: ms })]))),
      branch: merge(
        [4000, 4300, 4900].map((ms) => measurement([result({ pageHydratedMs: ms }, warm)])),
      ),
    });
    expect(text.indexOf("## Routes that hydrate later")).toBeLessThan(text.indexOf("## Script"));
    expect(text).toContain(
      "- `/nhl`: 4300 (4000 to 4900) ms against 4200 (4100 to 4400) ms (the ranges overlap)",
    );
    expect(text).toContain("## Routes over their script budget\n\nNone.");
    expect(text).toContain("**later** ✗ by 100 ms, ranges overlap");
  });
});
