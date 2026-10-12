import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  budgetTable,
  judge,
  type Measurement,
  median,
  type RouteResult,
  report,
  SCRIPT_BUDGETS_KB,
  scriptBudgetKb,
  weightTable,
} from "./budgets.ts";
import { FIXTURE_SUBJECTS, measuredRoutes } from "./routes.ts";

const recorded = (target: "local" | "deployed"): { json: Measurement; markdown: string } => {
  const read = (extension: string) =>
    readFileSync(
      new URL(`../../docs/performance/results/${target}.${extension}`, import.meta.url),
      "utf8",
    );
  return { json: JSON.parse(read("json")), markdown: read("md") };
};

const detailOf = (result: RouteResult) =>
  report({
    base: "http://localhost:1",
    measuredAt: "2026-10-12T00:00:00.000Z",
    runs: 1,
    machine: "a machine",
    failures: [],
    results: [result],
  });

const measured = (changes: Partial<RouteResult> = {}): RouteResult => ({
  route: "/nhl",
  path: "/nhl",
  mode: "cached",
  cacheStatus: ["hit"],
  ttfbMs: 600,
  firstPaintMs: 1200,
  largestPaintMs: 1400,
  largestPaintElement: "h1",
  hydratedMs: 2400,
  loadShift: 0,
  loadShifts: [],
  liveShift: 0,
  liveShifts: [],
  interactions: [
    { name: "theme", ms: 120 },
    { name: "menu", ms: 80 },
  ],
  navigation: {
    to: "/nhl/teams/21",
    shellMs: 90,
    contentMs: 700,
    blankFrames: 0,
    viewTransition: false,
    requestsAfterTap: 0,
    documentLoad: false,
  },
  script: { files: 12, rawBytes: 500_000, gzipBytes: 150_000 },
  document: { files: 1, rawBytes: 170_000, gzipBytes: 14_000 },
  stylesheet: { files: 1, rawBytes: 60_000, gzipBytes: 11_000 },
  ...changes,
});

describe("judge", () => {
  it("passes a route inside every budget", () => {
    expect(judge(measured())).toMatchObject({
      loadShift: "pass",
      liveShift: "pass",
      largestPaint: "pass",
      largestPaintBudgetMs: 1500,
      interaction: "pass",
      navigation: "pass",
    });
  });

  it("gives a rendered page 2.5 seconds to its largest paint and a cached page 1.5", () => {
    expect(judge(measured({ largestPaintMs: 2000 })).largestPaint).toBe("miss");
    const rendered = judge(measured({ mode: "rendered", largestPaintMs: 2000 }));
    expect(rendered).toMatchObject({ largestPaint: "pass", largestPaintBudgetMs: 2500 });
    expect(judge(measured({ mode: "rendered", largestPaintMs: 2500 })).largestPaint).toBe("miss");
  });

  it("calls a shift that prints as 0.000 zero, and anything more a miss", () => {
    expect(judge(measured({ loadShift: 0.00008 })).loadShift).toBe("pass");
    expect(judge(measured({ loadShift: 0.0005 })).loadShift).toBe("miss");
    expect(judge(measured({ liveShift: 0.008 })).liveShift).toBe("miss");
  });

  it("does not judge live data it could not push", () => {
    expect(judge(measured({ liveShift: null })).liveShift).toBe("not measured");
  });

  it("judges interaction by the slowest tap", () => {
    const verdict = judge(
      measured({
        interactions: [
          { name: "theme", ms: 240 },
          { name: "menu", ms: 80 },
          { name: "absent", ms: null },
        ],
      }),
    );
    expect(verdict.interaction).toBe("miss");
    expect(verdict.worstInteraction).toEqual({ name: "theme", ms: 240 });
    expect(judge(measured({ interactions: [] })).interaction).toBe("not measured");
  });

  it("misses navigation on a late shell or on any blank frame", () => {
    const navigation = measured().navigation;
    if (navigation == null) throw new Error("the sample has a navigation");
    expect(judge(measured({ navigation: { ...navigation, shellMs: 900 } })).navigation).toBe(
      "miss",
    );
    expect(judge(measured({ navigation: { ...navigation, blankFrames: 2 } })).navigation).toBe(
      "miss",
    );
    expect(judge(measured({ navigation: { ...navigation, documentLoad: true } })).navigation).toBe(
      "miss",
    );
    expect(judge(measured({ navigation: null })).navigation).toBe("not measured");
  });

  it("misses a navigation that arrived at the not-found page, however fast", () => {
    const navigation = measured().navigation;
    if (navigation == null) throw new Error("the sample has a navigation");
    expect(judge(measured({ navigation: { ...navigation, notFound: true } })).navigation).toBe(
      "miss",
    );
    expect(judge(measured({ navigation: { ...navigation, notFound: false } })).navigation).toBe(
      "pass",
    );
  });
});

describe("hydration in the report", () => {
  it("prints the site's own mark and the time every control had hydrated side by side", () => {
    const text = report({
      base: "http://localhost:1",
      measuredAt: "2026-10-12T00:00:00.000Z",
      runs: 1,
      machine: "a machine",
      load: { before: [3.21, 3, 3], after: [4.56, 4, 4] },
      label: "tanstack-start abc1234",
      failures: [],
      results: [measured({ hydratedMs: 2400, pageHydratedMs: 2731 })],
    });
    expect(text).toContain("| Site's own hydration mark ms | Every control hydrated ms |");
    expect(text).toContain("| 2400 | 2731 |");
    expect(text).toContain("(tanstack-start abc1234)");
    expect(text).toContain("its load 3.2 as the run began and 4.6 as it ended");
  });

  it("lists what a page logged as an error, and has no such table when none did", () => {
    const text = detailOf(measured({ errors: ["Minified React error #418; visit"] }));
    expect(text).toContain("### Errors the pages logged");
    expect(text).toContain("| `/nhl` | cached | Minified React error #418; visit |");
    expect(detailOf(measured({ errors: [] }))).not.toContain("Errors the pages logged");
  });

  it("prints a measurement taken before the watch existed as it was printed then", () => {
    const text = detailOf(measured({ hydratedMs: 2400 }));
    expect(text).toContain("| Taps work from ms |");
    expect(text).not.toContain("Every control hydrated");
    expect(text).not.toContain("Arrived at not-found");
  });
});

describe("the script budget", () => {
  it("is the measured gzip size rounded up to a whole kB", () => {
    expect(scriptBudgetKb(150_000)).toBe(147);
    expect(scriptBudgetKb(1024 * 147)).toBe(147);
    expect(scriptBudgetKb(1024 * 147 + 1)).toBe(148);
  });

  it("is, for every route measured, what the recorded baseline sent", () => {
    const sent = new Map<string, number>();
    for (const result of recorded("local").json.results) {
      sent.set(result.route, Math.max(sent.get(result.route) ?? 0, result.script.gzipBytes));
    }
    const fromBaseline = Object.fromEntries(
      [...sent].map(([route, gzipBytes]) => [route, scriptBudgetKb(gzipBytes)]),
    );
    expect(SCRIPT_BUDGETS_KB).toEqual(fromBaseline);
    // Every route measured has its budget but the not-found page, which the baseline left out.
    const routes = measuredRoutes(FIXTURE_SUBJECTS).map((route) => route.route);
    expect(routes.filter((route) => SCRIPT_BUDGETS_KB[route] == null)).toEqual(["not found"]);
    expect(Object.keys(SCRIPT_BUDGETS_KB).filter((route) => !routes.includes(route))).toEqual([]);
  });

  it("is missed by a route that sends a byte more, and met at the budget itself", () => {
    const budget = (SCRIPT_BUDGETS_KB["/nhl"] as number) * 1024;
    const sending = (gzipBytes: number) =>
      judge(measured({ script: { files: 29, rawBytes: 800_000, gzipBytes } }));
    expect(sending(budget)).toMatchObject({ script: "pass", scriptBudgetKb: 244 });
    expect(sending(budget + 1).script).toBe("miss");
    expect(
      budgetTable([measured({ script: { files: 29, rawBytes: 800_000, gzipBytes: budget + 1 } })]),
    ).toContain("**244.0** ✗");
  });

  it("does not judge a route that has no budget yet", () => {
    expect(judge(measured({ route: "/new" }))).toMatchObject({
      script: "not measured",
      scriptBudgetKb: null,
    });
  });
});

describe("the recorded results", () => {
  it.each(["local", "deployed"] as const)("%s.md is what its JSON reports", (target) => {
    const { json, markdown } = recorded(target);
    expect(report(json)).toBe(markdown);
  });
});

describe("the tables", () => {
  it("marks each miss in the budget table and leaves a pass plain", () => {
    const text = budgetTable([measured(), measured({ path: "/", route: "/", loadShift: 0.0102 })]);
    const [, , passing, missing] = text.split("\n");
    expect(passing).toContain(
      "| 1200 | 1400 (1500) | 0.0000 | 0.0000 | 120 (theme) | 90 | 0 | no |",
    );
    expect(passing).not.toContain("✗");
    expect(missing).toContain("**0.0102** ✗");
  });

  it("gives one row a route, the mode that sent more, against the route's script budget", () => {
    const text = weightTable([
      measured(),
      measured({ mode: "rendered", script: { files: 13, rawBytes: 510_000, gzipBytes: 151_000 } }),
    ]);
    expect(text.split("\n")).toHaveLength(3);
    expect(text).toContain("| 13 | 498.0 | 147.5 | **244** |");
  });

  it("gives a route with no budget the one its own measurement sets", () => {
    const text = weightTable([
      measured({ route: "/new", script: { files: 13, rawBytes: 510_000, gzipBytes: 151_000 } }),
    ]);
    expect(text).toContain("| 13 | 498.0 | 147.5 | **148** |");
  });
});

describe("median", () => {
  it("is the middle run", () => {
    expect(median([300, 100, 200])).toBe(200);
    expect(median([])).toBeNaN();
  });
});
