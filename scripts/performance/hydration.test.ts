import { afterEach, describe, expect, it, vi } from "vitest";
import { pageHydrated } from "./hydration.ts";

/** A document with these controls: each is the list of property names the element carries. */
const documentWith = (readyState: string, controls: string[][]) =>
  vi.stubGlobal("document", {
    readyState,
    querySelectorAll: () => controls.map((keys) => Object.fromEntries(keys.map((key) => [key, 1]))),
  });

afterEach(() => vi.unstubAllGlobals());

describe("pageHydrated", () => {
  it("is true once every control carries React's fiber", () => {
    documentWith("complete", [["__reactFiber$abc", "__reactProps$abc"], ["__reactFiber$abc"]]);
    expect(pageHydrated()).toBe(true);
  });

  it("is false while one control is still only the server's HTML", () => {
    // The masthead's link has hydrated; the search box inside the router's boundary has not.
    documentWith("interactive", [["__reactFiber$abc"], []]);
    expect(pageHydrated()).toBe(false);
  });

  it("is false while the document is still arriving, whatever has hydrated so far", () => {
    documentWith("loading", [["__reactFiber$abc"]]);
    expect(pageHydrated()).toBe(false);
  });

  it("is false for a document with nothing to tap: there is nothing to tell by", () => {
    documentWith("complete", []);
    expect(pageHydrated()).toBe(false);
  });
});
