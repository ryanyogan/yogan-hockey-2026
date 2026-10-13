import { describe, expect, it } from "vitest";
import { restoreScrollAfterHydration } from "./scroll-on-hydration";

describe("restoreScrollAfterHydration", () => {
  it("leaves the scroll alone at the browser's first render, which is hydration, and restores at every one after", () => {
    const restore = restoreScrollAfterHydration(true);
    expect(restore()).toBe(false);
    expect(restore()).toBe(true);
    expect(restore()).toBe(true);
  });

  it("always answers yes on the server, where there is no hydration to wait for", () => {
    const restore = restoreScrollAfterHydration(false);
    expect(restore()).toBe(true);
    expect(restore()).toBe(true);
  });

  it("counts each router's renders apart", () => {
    const first = restoreScrollAfterHydration(true);
    first();
    expect(restoreScrollAfterHydration(true)()).toBe(false);
    expect(first()).toBe(true);
  });
});
