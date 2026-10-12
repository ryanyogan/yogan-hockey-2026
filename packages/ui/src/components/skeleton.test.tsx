import { describe, expect, it } from "vitest";
import { render } from "../test/render";
import { LedgerSkeleton, SkeletonBar } from "./skeleton";

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

  it("is a bar of a named width, hidden from a screen reader", () => {
    const bar = render(<SkeletonBar width="lg" />).slot("skeleton-bar");
    expect(bar.attributes["aria-hidden"]).toBe("true");
    expect(bar.classes).toEqual(["w-32"]);
  });
});
