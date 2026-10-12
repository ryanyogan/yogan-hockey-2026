import { describe, expect, it } from "vitest";
import { render } from "../test/render";
import { PageHeader, Section, SectionHeader } from "./section";

describe("SectionHeader, a red label over an ink rule", () => {
  it("is a second-level heading in the label's red capitals over a plain rule", () => {
    const view = render(
      <Section>
        <SectionHeader title="Roster" />
      </Section>,
    );
    expect(view.slot("section").tag).toBe("section");
    expect(view.slot("section-header").classes).toEqual(
      expect.arrayContaining(["border-b", "border-rule"]),
    );
    expect(view.tag("h2").classes).toEqual(
      expect.arrayContaining([
        "text-kicker",
        "text-tag",
        "font-strong",
        "uppercase",
        "tracking-label",
      ]),
    );
    expect(view.text).toBe("Roster");
  });

  it("says a count quietly beside the label, and puts its children at the line's end", () => {
    const view = render(
      <SectionHeader title="Tonight" count="6 games">
        <a href="/nhl/live">all scores</a>
      </SectionHeader>,
    );
    expect(view.text).toBe("Tonight 6 gamesall scores");
    expect(view.slot("section-count").classes).toEqual(
      expect.arrayContaining(["text-label", "normal-case", "tracking-normal"]),
    );
    expect(view.html).toMatch(/<h2[^>]*>Tonight <span data-slot="section-count"/);
    expect(view.slot("section-aside").classes).toEqual(
      expect.arrayContaining(["text-small", "uppercase", "tracking-head"]),
    );
  });

  it("draws neither a count nor an aside it was not given", () => {
    const view = render(<SectionHeader title="Roster" />);
    expect(view.count("section-count")).toBe(0);
    expect(view.count("section-aside")).toBe(0);
  });
});

describe("PageHeader, a serif title over a heavy rule", () => {
  it("is the page's first heading, in the serif, over a 3px ink rule", () => {
    const view = render(<PageHeader title="Standings" />);
    expect(view.slot("page-header").tag).toBe("header");
    expect(view.slot("page-header").classes).toEqual(
      expect.arrayContaining(["border-b-3", "border-rule"]),
    );
    expect(view.tag("h1").classes).toEqual(
      expect.arrayContaining(["font-serif", "text-title", "font-strong", "tracking-[-0.01em]"]),
    );
    expect(view.text).toBe("Standings");
  });

  it("takes a count and children as a section's header does", () => {
    const view = render(
      <PageHeader title="Teams" count="32 teams">
        <a href="/nhl">more</a>
      </PageHeader>,
    );
    expect(view.text).toBe("Teams 32 teamsmore");
    expect(view.slot("page-count").classes).toContain("font-agate");
    expect(view.count("page-aside")).toBe(1);
  });
});
