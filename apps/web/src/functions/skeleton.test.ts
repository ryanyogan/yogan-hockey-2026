import { describe, expect, it } from "vitest";
import { AGATE_SLATES } from "../../lib/agate-slates";
import { EMPTY_SLATE, QUIET_SLATE, SAMPLE_SLATE } from "../../lib/sample-slate";
import {
  SampleDashboardSchema,
  SampleLiveSchema,
  SeedPicksSchema,
  sampleDashboard,
  sampleLive,
} from "./skeleton";

/** Names every object answers to, none of them a slate (#199). */
const INHERITED = ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"];

describe("what the sample pages' server functions accept", () => {
  it("seeds the final's pick right unless asked for wrong", () => {
    expect(SeedPicksSchema.parse({ final: "wrong" })).toEqual({ final: "wrong" });
    expect(SeedPicksSchema.parse({ final: "right" })).toEqual({ final: "right" });
    expect(SeedPicksSchema.parse({ final: "both" })).toEqual({ final: "right" });
    expect(SeedPicksSchema.parse({})).toEqual({ final: "right" });
  });

  it("reads the sample dashboard's slate, picks, news and pieces, and takes anything else for no slate, no picks, the news and the pieces", () => {
    expect(
      SampleDashboardSchema.parse({ slate: "busy", picks: true, news: false, pieces: false }),
    ).toEqual({ slate: "busy", picks: true, news: false, pieces: false });
    expect(SampleDashboardSchema.parse({})).toEqual({ picks: false, news: true, pieces: true });
    expect(
      SampleDashboardSchema.parse({ slate: 7, picks: "yes", news: "no", pieces: "no" }),
    ).toEqual({ picks: false, news: true, pieces: true });
  });

  it("reads the sample live page's slate, and takes anything else for none", () => {
    expect(SampleLiveSchema.parse({ slate: "quiet" })).toEqual({ slate: "quiet" });
    expect(SampleLiveSchema.parse({ slate: ["quiet"] })).toEqual({});
  });

  it("draws the slate the sample live page is asked for by name", () => {
    expect(sampleLive("empty")).toBe(EMPTY_SLATE);
    expect(sampleLive("quiet")).toBe(QUIET_SLATE);
    expect(sampleLive(undefined)).toBe(SAMPLE_SLATE);
    expect(sampleLive("no-such-slate")).toBe(SAMPLE_SLATE);
  });

  it.each(INHERITED)("draws the sample live page's default slate for a slate named %s", (name) => {
    expect(sampleLive(name)).toBe(SAMPLE_SLATE);
  });

  it("draws the slate the sample dashboard is asked for by name", () => {
    expect(sampleDashboard({ slate: "tonight", picks: false })).toBe(AGATE_SLATES.tonight);
    expect(sampleDashboard({ slate: "empty", picks: false }).scoreboard).toBe(EMPTY_SLATE);
    expect(sampleDashboard({ slate: "no-such-slate", picks: false })).toEqual({
      scoreboard: SAMPLE_SLATE,
      picks: {},
      record: null,
    });
  });

  it.each(INHERITED)("draws the sample dashboard's default slate for a slate named %s", (name) => {
    expect(sampleDashboard({ slate: name, picks: false })).toEqual({
      scoreboard: SAMPLE_SLATE,
      picks: {},
      record: null,
    });
  });
});
