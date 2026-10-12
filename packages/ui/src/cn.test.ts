import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a size token beside a colour token", () => {
    expect(cn("text-small text-label")).toBe("text-small text-label");
    expect(cn("font-score text-score", "text-note")).toBe("font-score text-score text-note");
  });

  it("lets a later size replace an earlier one, and a later colour an earlier one", () => {
    expect(cn("text-body", "text-small")).toBe("text-small");
    expect(cn("text-note", "text-aside")).toBe("text-aside");
  });

  it("knows a weight token from a typeface", () => {
    expect(cn("font-agate font-body", "font-strong")).toBe("font-agate font-strong");
    expect(cn("font-serif font-strong", "font-quiet")).toBe("font-serif font-quiet");
  });

  it("lets a later typeface replace an earlier one and leaves the weight", () => {
    expect(cn("font-agate font-label", "font-serif")).toBe("font-label font-serif");
    expect(cn("font-serif", "font-agate")).toBe("font-agate");
  });

  it("lets a caller's padding replace a row's", () => {
    expect(cn("px-2 py-row", "py-2")).toBe("px-2 py-2");
    expect(cn("py-1", "py-row")).toBe("py-row");
  });

  it("lets a caller's tracking replace a label's", () => {
    expect(cn("tracking-label", "tracking-normal")).toBe("tracking-normal");
  });
});
