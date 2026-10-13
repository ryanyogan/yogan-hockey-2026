import { describe, expect, it } from "vitest";
import { SampleDashboardSchema, SampleLiveSchema, SeedPicksSchema } from "./skeleton";

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
});
