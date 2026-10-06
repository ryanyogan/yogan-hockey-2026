import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isInternalHref, linkIntent } from "./link-intent";

describe("a link the visitor means to follow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const watch = (dwellMs = 65) => {
    const fetched: string[] = [];
    return { fetched, intent: linkIntent((href) => fetched.push(href), dwellMs) };
  };

  it("is prefetched once the pointer has rested on it", () => {
    const { fetched, intent } = watch();
    intent.rest("/nhl/teams/1");
    vi.advanceTimersByTime(64);
    expect(fetched).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(fetched).toEqual(["/nhl/teams/1"]);
  });

  it("is not prefetched when the pointer only crosses it", () => {
    const { fetched, intent } = watch();
    intent.rest("/nhl/teams/1");
    vi.advanceTimersByTime(30);
    intent.leave();
    vi.advanceTimersByTime(1000);
    expect(fetched).toEqual([]);
  });

  it("prefetches one link of a list the pointer is drawn down, the one it stops on", () => {
    const { fetched, intent } = watch();
    for (let id = 1; id <= 32; id++) {
      intent.rest(`/nhl/teams/${id}`);
      vi.advanceTimersByTime(20);
    }
    vi.advanceTimersByTime(1000);
    expect(fetched).toEqual(["/nhl/teams/32"]);
  });

  it("is prefetched at once by a touch or a press, which a click follows", () => {
    const { fetched, intent } = watch();
    intent.press("/players/4024123");
    expect(fetched).toEqual(["/players/4024123"]);
  });

  it("does not prefetch twice when a press follows the rest", () => {
    const { fetched, intent } = watch();
    intent.rest("/nhl/live");
    intent.press("/nhl/live");
    vi.advanceTimersByTime(1000);
    expect(fetched).toEqual(["/nhl/live"]);
  });
});

describe("which links are the site's own", () => {
  it("takes a path on the site", () => {
    expect(isInternalHref("/nhl/teams/1")).toBe(true);
    expect(isInternalHref("/nhl?tab=teams")).toBe(true);
  });

  it("leaves alone another site, a place on this page, and a path that is not rooted", () => {
    expect(isInternalHref("https://www.espn.com/nhl")).toBe(false);
    expect(isInternalHref("//espn.com")).toBe(false);
    expect(isInternalHref("#results")).toBe(false);
    expect(isInternalHref("roster")).toBe(false);
  });
});
