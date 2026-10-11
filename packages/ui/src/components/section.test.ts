import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SectionHeader } from "./section";

const titleOf = (markup: string) => (/<h2 class="([^"]*)"/.exec(markup)?.[1] ?? "").split(" ");

describe("SectionHeader", () => {
  it("draws a section's title in the body's size", () => {
    const markup = renderToStaticMarkup(createElement(SectionHeader, { title: "Standings" }));
    expect(titleOf(markup)).toContain("font-strong");
    expect(titleOf(markup)).not.toContain("text-score");
  });

  it("draws the title that leads a page in the score's size, and its count as any other", () => {
    const markup = renderToStaticMarkup(
      createElement(SectionHeader, { title: "Wild", count: "Saint Paul", lead: true }),
    );
    expect(titleOf(markup)).toContain("text-score");
    expect(markup).toContain(
      '<span data-slot="section-count" class="font-quiet text-body text-label normal-case">Saint Paul</span>',
    );
  });

  it("does not pass `lead` on to the element", () => {
    const markup = renderToStaticMarkup(
      createElement(SectionHeader, { title: "Wild", lead: true }),
    );
    expect(markup).not.toContain("lead");
  });
});
