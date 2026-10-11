import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BASELINE_SCRIPT_BUDGETS_KB,
  budgetTable,
  judge,
  type Measurement,
  median,
  type RouteResult,
  report,
  SCRIPT_BUDGETS_KB,
  SCRIPT_HEADROOM_KB,
  scriptBudgetKb,
  weightTable,
} from "./budgets.ts";
import { FIXTURE_SUBJECTS, measuredRoutes } from "./routes.ts";

type Recorded = "local" | "deployed" | "after-local";

const recorded = (target: Recorded): { json: Measurement; markdown: string } => {
  const read = (extension: string) =>
    readFileSync(
      new URL(`../../docs/performance/results/${target}.${extension}`, import.meta.url),
      "utf8",
    );
  return { json: JSON.parse(read("json")), markdown: read("md") };
};

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
});

describe("the script budget", () => {
  it("is the measured gzip size rounded up to a whole kB", () => {
    expect(scriptBudgetKb(150_000)).toBe(147);
    expect(scriptBudgetKb(1024 * 147)).toBe(147);
    expect(scriptBudgetKb(1024 * 147 + 1)).toBe(148);
  });

  /** The most each route sent in a recorded run, rounded up to a whole kB. */
  const sentIn = (target: Recorded): Record<string, number> => {
    const sent = new Map<string, number>();
    for (const result of recorded(target).json.results) {
      sent.set(result.route, Math.max(sent.get(result.route) ?? 0, result.script.gzipBytes));
    }
    return Object.fromEntries(
      [...sent].map(([route, gzipBytes]) => [route, scriptBudgetKb(gzipBytes)]),
    );
  };
  const everyRoute = measuredRoutes(FIXTURE_SUBJECTS)
    .map((route) => route.route)
    .sort();

  it("was, in the baseline, what each route then sent", () => {
    expect(BASELINE_SCRIPT_BUDGETS_KB).toEqual(sentIn("local"));
    expect(Object.keys(BASELINE_SCRIPT_BUDGETS_KB).sort()).toEqual(everyRoute);
  });

  it("is, for every route measured, what the final run of #127 sent and the headroom", () => {
    const withHeadroom = Object.fromEntries(
      Object.entries(sentIn("after-local")).map(([route, kb]) => [route, kb + SCRIPT_HEADROOM_KB]),
    );
    expect(SCRIPT_BUDGETS_KB).toEqual(withHeadroom);
    expect(Object.keys(SCRIPT_BUDGETS_KB).sort()).toEqual(everyRoute);
  });

  it("is on no route above the baseline's", () => {
    for (const [route, budget] of Object.entries(SCRIPT_BUDGETS_KB)) {
      expect(budget, route).toBeLessThanOrEqual(BASELINE_SCRIPT_BUDGETS_KB[route] as number);
    }
  });

  it("is missed by a route that sends a byte more, and met at the budget itself", () => {
    const budgetKb = SCRIPT_BUDGETS_KB["/nhl"] as number;
    const budget = budgetKb * 1024;
    const sending = (gzipBytes: number) =>
      judge(measured({ script: { files: 29, rawBytes: 800_000, gzipBytes } }));
    expect(sending(budget)).toMatchObject({ script: "pass", scriptBudgetKb: budgetKb });
    expect(sending(budget + 1).script).toBe("miss");
    expect(
      budgetTable([measured({ script: { files: 29, rawBytes: 800_000, gzipBytes: budget + 1 } })]),
    ).toContain(`**${budgetKb}.0** ✗`);
  });

  it("does not judge a route that has no budget yet", () => {
    expect(judge(measured({ route: "/new" }))).toMatchObject({
      script: "not measured",
      scriptBudgetKb: null,
    });
  });
});

describe("the recorded results", () => {
  // The baseline's two runs were judged by the baseline's script budgets, and still read so.
  it.each(["local", "deployed"] as const)("%s.md is what its JSON reports", (target) => {
    const { json, markdown } = recorded(target);
    expect(report(json, BASELINE_SCRIPT_BUDGETS_KB)).toBe(markdown);
  });

  it("after-local.md is what its JSON reports, against today's script budgets", () => {
    const { json, markdown } = recorded("after-local");
    expect(report(json)).toBe(markdown);
  });

  it("the final run of #127 sent no route more script than its budget", () => {
    for (const result of recorded("after-local").json.results) {
      expect(judge(result).script, `${result.route} ${result.mode}`).toBe("pass");
    }
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
    expect(text).toContain(`| 13 | 498.0 | 147.5 | **${SCRIPT_BUDGETS_KB["/nhl"]}** |`);
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
