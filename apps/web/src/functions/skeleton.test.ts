import { describe, expect, it } from "vitest";
import { SampleDashboardSchema, SampleLiveSchema, SeedPicksSchema } from "./skeleton";

describe("what the sample pages' server functions accept", () => {
  it("seeds the final's pick right unless asked for wrong", () => {
    expect(SeedPicksSchema.parse({ final: "wrong" })).toEqual({ final: "wrong" });
    expect(SeedPicksSchema.parse({ final: "right" })).toEqual({ final: "right" });
    expect(SeedPicksSchema.parse({ final: "both" })).toEqual({ final: "right" });
    expect(SeedPicksSchema.parse({})).toEqual({ final: "right" });
  });

  it("reads the sample dashboard's slate, picks and news, and takes anything else for no slate, no picks and the news", () => {
    expect(SampleDashboardSchema.parse({ slate: "busy", picks: true, news: false })).toEqual({
      slate: "busy",
      picks: true,
      news: false,
    });
    expect(SampleDashboardSchema.parse({})).toEqual({ picks: false, news: true });
    expect(SampleDashboardSchema.parse({ slate: 7, picks: "yes", news: "no" })).toEqual({
      picks: false,
      news: true,
    });
  });

  it("reads the sample live page's slate, and takes anything else for none", () => {
    expect(SampleLiveSchema.parse({ slate: "quiet" })).toEqual({ slate: "quiet" });
    expect(SampleLiveSchema.parse({ slate: ["quiet"] })).toEqual({});
  });
});
