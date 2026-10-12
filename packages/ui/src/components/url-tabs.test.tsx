import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { render } from "../test/render";
import { tabCellVariants, UrlTabs } from "./url-tabs";

const TABS = [
  { value: "schedule", label: "schedule", href: "?tab=schedule" },
  { value: "roster", label: "roster", href: "?tab=roster" },
];

describe("UrlTabs, the conference control as links", () => {
  it("is a named nav of links, the current one marked as the page", () => {
    const view = render(<UrlTabs label="Team" current="roster" tabs={TABS} />);
    expect(view.slot("url-tabs").tag).toBe("nav");
    expect(view.slot("url-tabs").attributes["aria-label"]).toBe("Team");
    expect(view.tag("a").attributes.href).toBe("?tab=schedule");
    expect(view.tag("a").attributes["aria-current"]).toBeUndefined();
    expect(view.tag("a", 1).attributes["aria-current"]).toBe("page");
    expect(view.text).toBe("scheduleroster");
  });

  it("frames the set in ink, each cell a thumb tall and ruled off from the one before", () => {
    const view = render(<UrlTabs label="Team" current="roster" tabs={TABS} />);
    expect(view.slot("url-tabs").classes).toEqual(
      expect.arrayContaining(["border", "border-rule", "max-md:w-full"]),
    );
    expect(view.tag("a").classes).toEqual(
      expect.arrayContaining([
        "min-h-11",
        "border-l",
        "first-of-type:border-l-0",
        "text-small",
        "font-label",
        "uppercase",
        "tracking-mark",
      ]),
    );
  });

  it("fills the current cell with ink and leaves the rest paper", () => {
    const view = render(<UrlTabs label="Team" current="roster" tabs={TABS} />);
    expect(view.tag("a", 1).classes).toEqual(
      expect.arrayContaining(["bg-foreground", "text-background"]),
    );
    expect(view.tag("a").classes).not.toContain("bg-foreground");
    expect(tabCellVariants({ current: true })).toContain("bg-foreground");
  });

  it("draws a cell's focus ring inside it, since the strip clips, and shares a phone equally", () => {
    const cell = tabCellVariants({ current: false }).split(" ");
    expect(cell).toContain("focus-visible:-outline-offset-2");
    expect(cell).not.toContain("focus-visible:outline-offset-2");
    expect(cell).toContain("max-md:flex-1");
  });

  it("renders the app's link component when given one", () => {
    const Link = ({ href, ...props }: ComponentProps<"a">) => (
      <a data-link="" href={`/app${href}`} {...props} />
    );
    const view = render(<UrlTabs label="Team" current="roster" tabs={TABS} link={Link} />);
    expect(view.tag("a").attributes.href).toBe("/app?tab=schedule");
  });
});
