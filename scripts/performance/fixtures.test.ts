import { describe, expect, it } from "vitest";
import { finishedGameReady } from "./fixtures.ts";

const replay = '<main><div data-slot="replay-transport"></div></main>';
const plays = '<main><div data-slot="replay-pending"></div></main>';

describe("finishedGameReady", () => {
  it("is ready on a site with no page cache once the server draws the Replay", () => {
    expect(finishedGameReady({ ok: true, pageCache: null, html: replay })).toBe(true);
  });

  it("is not ready while the page still waits for the archive", () => {
    expect(finishedGameReady({ ok: true, pageCache: null, html: plays })).toBe(false);
  });

  it("waits, on a site with a page cache, until the cache answers the archived page", () => {
    expect(finishedGameReady({ ok: true, pageCache: "miss", html: replay })).toBe(false);
    expect(finishedGameReady({ ok: true, pageCache: "bypass", html: replay })).toBe(false);
    expect(finishedGameReady({ ok: true, pageCache: "hit", html: replay })).toBe(true);
    expect(finishedGameReady({ ok: true, pageCache: "stale", html: replay })).toBe(true);
  });

  it("is not ready on a page that failed", () => {
    expect(finishedGameReady({ ok: false, pageCache: null, html: replay })).toBe(false);
  });
});
