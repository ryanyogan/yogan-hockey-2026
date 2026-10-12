import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render } from "../test/render";
import {
  Ledger,
  LedgerAside,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerDetail,
  LedgerHead,
  LedgerRow,
} from "./ledger";

const table = (row: ReactNode) =>
  render(
    <Ledger aria-label="Standings">
      <LedgerHead>
        <LedgerColumn>team</LedgerColumn>
        <LedgerColumn numeric>pts</LedgerColumn>
        <LedgerColumn />
      </LedgerHead>
      <LedgerBody>{row}</LedgerBody>
    </Ledger>,
  );

describe("Ledger, an agate table", () => {
  it("is a real table inside a box that scrolls sideways by itself", () => {
    const view = table(<LedgerRow />);
    expect(view.slot("ledger").tag).toBe("div");
    expect(view.slot("ledger").classes).toContain("overflow-x-auto");
    expect(view.tag("table").attributes["aria-label"]).toBe("Standings");
    expect(view.html).toMatch(/<table[^>]*><thead[^>]*><tr><th/);
  });

  it("heads a column in small bold capitals over a hairline", () => {
    const head = table(<LedgerRow />).slot("ledger-column");
    expect(head.tag).toBe("th");
    expect(head.attributes.scope).toBe("col");
    expect(head.classes).toEqual(
      expect.arrayContaining([
        "text-head",
        "font-strong",
        "uppercase",
        "tracking-head",
        "text-label",
        "border-b",
        "border-rule-head",
        "text-left",
      ]),
    );
  });

  it("sets a column of numbers to the right, and a column with no name is a plain cell", () => {
    const view = table(<LedgerRow />);
    expect(view.slot("ledger-column", 1).classes).toContain("text-right");
    expect(view.slot("ledger-column", 2).tag).toBe("td");
    expect(view.slot("ledger-column", 2).attributes.scope).toBeUndefined();
  });

  it("rules its rows with dots, none under the last, and tints the one under the pointer", () => {
    const row = table(<LedgerRow />).slot("ledger-row");
    expect(row.classes).toEqual(
      expect.arrayContaining([
        "border-b",
        "border-dotted",
        "border-border",
        "last:border-b-0",
        "hover:bg-highlight",
      ]),
    );
  });

  it("draws the cutoff as a plain ink rule", () => {
    const row = table(<LedgerRow cutoff />).slot("ledger-row");
    expect(row.attributes["data-cutoff"]).toBe("");
    expect(row.classes).toEqual(expect.arrayContaining(["border-solid", "border-rule"]));
    expect(row.classes).not.toContain("border-dotted");
  });

  it("makes every row a thumb tall on a phone, a link or with one in a cell", () => {
    expect(table(<LedgerRow />).slot("ledger-row").classes).toContain("max-md:h-11");
  });

  it("marks a live row and does not tint it", () => {
    const row = table(<LedgerRow live />).slot("ledger-row");
    expect(row.attributes["data-live"]).toBe("");
    expect(row.classes.filter((name) => name.startsWith("bg-"))).toEqual([]);
  });

  it("sets a cell in the row's size, its numbers tabular and to the right, the key one bold", () => {
    const view = table(
      <LedgerRow>
        <LedgerCell>
          Seattle <LedgerAside>4-2-0</LedgerAside>
          <LedgerDetail fine>pick</LedgerDetail>
        </LedgerCell>
        <LedgerCell numeric tone="strong">
          8
        </LedgerCell>
        <LedgerCell tone="score">5</LedgerCell>
      </LedgerRow>,
    );
    expect(view.slot("ledger-cell").classes).toEqual(
      expect.arrayContaining(["text-row", "py-row", "first:pl-0", "last:pr-0"]),
    );
    expect(view.slot("ledger-cell").classes).not.toContain("text-right");
    const points = view.slot("ledger-cell", 1);
    expect(points.attributes["data-tone"]).toBe("strong");
    expect(points.classes).toEqual(
      expect.arrayContaining(["text-right", "tabular-nums", "font-strong"]),
    );
    expect(view.slot("ledger-cell", 2).classes).toEqual(
      expect.arrayContaining(["text-right", "font-score", "text-score"]),
    );
    expect(view.slot("ledger-aside").classes).toContain("text-aside");
    expect(view.slot("ledger-detail").classes).toEqual(
      expect.arrayContaining(["text-small", "text-label", "truncate"]),
    );
  });
});
