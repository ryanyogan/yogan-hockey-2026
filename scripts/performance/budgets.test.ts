import { describe, expect, it } from "vitest";
import {
  budgetTable,
  judge,
  median,
  type RouteResult,
  scriptBudgetKb,
  weightTable,
} from "./budgets.ts";

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

  it("sets one script budget a route, from the mode that sent more", () => {
    const text = weightTable([
      measured(),
      measured({ mode: "rendered", script: { files: 13, rawBytes: 510_000, gzipBytes: 151_000 } }),
    ]);
    expect(text.split("\n")).toHaveLength(3);
    expect(text).toContain("| 13 | 498.0 | 147.5 | **148** |");
  });
});

describe("median", () => {
  it("is the middle run", () => {
    expect(median([300, 100, 200])).toBe(200);
    expect(median([])).toBeNaN();
  });
});
