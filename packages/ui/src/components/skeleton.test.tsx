import { describe, expect, it } from "vitest";
import { render } from "../test/render";
import { LedgerSkeleton, PageHeaderSkeleton, SectionSkeleton, SkeletonBar } from "./skeleton";

const COLUMNS = [
  { width: "sm" as const },
  { width: "lg" as const, className: "w-full", detail: "fine" as const },
  { width: "sm" as const, numeric: true },
];

describe("skeletons, the real parts with a bar where each value would be", () => {
  it("draws a ledger of placeholder rows that a screen reader does not see", () => {
    const view = render(<LedgerSkeleton rows={3} columns={COLUMNS} />);
    expect(view.tag("table").attributes["aria-hidden"]).toBe("true");
    expect(view.tag("table").attributes["data-skeleton"]).toBe("");
    expect(view.count("ledger-column")).toBe(3);
    expect(view.count("ledger-row")).toBe(3);
    expect(view.count("ledger-cell")).toBe(9);
    expect(view.count("ledger-detail")).toBe(3);
    expect(view.slot("ledger-column", 2).classes).toContain("text-right");
    expect(view.slot("ledger-cell", 1).classes).toContain("w-full");
  });

  it("says once what is loading, under the section's real heading", () => {
    const view = render(<SectionSkeleton title="Roster" rows={2} columns={COLUMNS} />);
    expect(view.slot("section-skeleton").attributes["aria-busy"]).toBe("true");
    expect(view.tag("h2").classes).toContain("text-kicker");
    expect(view.html).toContain('<span role="status" class="sr-only">Loading roster</span>');
  });

  it("holds a heading's place with a bar when the heading is data", () => {
    const view = render(<SectionSkeleton label="The game" rows={1} columns={COLUMNS} />);
    expect(view.html).toMatch(/<h2[^>]*><span data-slot="skeleton-bar"/);
    expect(view.html).toContain("Loading the game");
  });

  it("holds a page title's place in the title's own size", () => {
    const view = render(<PageHeaderSkeleton />);
    expect(view.slot("page-header").classes).toContain("border-t-3");
    expect(view.html).toMatch(/<h1[^>]*><span data-slot="skeleton-bar"/);
    expect(render(<PageHeaderSkeleton title="Live scores" />).text).toBe("Live scores");
  });

  it("is a bar of a named width, hidden from a screen reader", () => {
    const bar = render(<SkeletonBar width="lg" />).slot("skeleton-bar");
    expect(bar.attributes["aria-hidden"]).toBe("true");
    expect(bar.classes).toEqual(["w-32"]);
  });
});
