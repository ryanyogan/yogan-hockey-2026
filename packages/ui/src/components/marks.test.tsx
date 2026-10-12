import { describe, expect, it } from "vitest";
import { render } from "../test/render";
import { Badge } from "./badge";
import { Button } from "./button";
import { LiveMarker } from "./marker";

const MARK = ["border", "text-tag", "font-strong", "uppercase", "tracking-mark", "leading-none"];

describe("Badge, a mark", () => {
  it("is small bold capitals in a 1px ink box, filled for the positive state", () => {
    const right = render(<Badge>right</Badge>).slot("badge");
    expect(right.tag).toBe("span");
    expect(right.classes).toEqual(
      expect.arrayContaining([...MARK, "border-rule", "bg-foreground", "text-background"]),
    );
  });

  it("is outlined, not filled, for the other state", () => {
    const wrong = render(<Badge variant="outline">wrong</Badge>).slot("badge");
    expect(wrong.classes).toEqual(expect.arrayContaining([...MARK, "border-rule"]));
    expect(wrong.classes).not.toContain("bg-foreground");
  });

  it("is the one red when live", () => {
    const live = render(<Badge variant="live">live</Badge>).slot("badge");
    expect(live.classes).toEqual(expect.arrayContaining(["border-kicker", "text-kicker"]));
  });
});

describe("LiveMarker", () => {
  it("says live in the one red, after a dot the eye alone is given", () => {
    const view = render(<LiveMarker />);
    expect(view.text).toBe("live");
    expect(view.slot("live-marker").classes).toEqual(
      expect.arrayContaining(["text-live", "font-label"]),
    );
    expect(view.tag("span", 1).attributes["aria-hidden"]).toBe("true");
    expect(view.tag("span", 1).classes).toEqual(
      expect.arrayContaining(["size-2", "rounded-[50%]", "bg-live", "motion-safe:animate-live"]),
    );
  });

  it("still says live to a screen reader when it is given more to say", () => {
    const view = render(<LiveMarker strong>2nd 12:34</LiveMarker>);
    expect(view.text).toBe("live, 2nd 12:34");
    expect(view.slot("live-marker").classes).toContain("font-strong");
    expect(view.html).toContain('<span class="sr-only">live, </span>');
  });
});

describe("Button", () => {
  it("is a thumb tall, in a mark's capitals, filled with ink", () => {
    const button = render(<Button>Bump</Button>).slot("button");
    expect(button.tag).toBe("button");
    expect(button.classes).toEqual(
      expect.arrayContaining([
        "min-h-11",
        "text-tag",
        "font-label",
        "uppercase",
        "tracking-mark",
        "bg-primary",
        "text-primary-foreground",
      ]),
    );
  });

  it("is outlined in ink and tinted under the pointer", () => {
    const button = render(<Button variant="outline">Wrong</Button>).slot("button");
    expect(button.classes).toEqual(expect.arrayContaining(["border-rule", "hover:bg-highlight"]));
    expect(button.classes).not.toContain("bg-primary");
  });

  it("is shorter at a desk when small, and still a thumb tall on a phone", () => {
    const button = render(<Button size="sm">1x</Button>).slot("button");
    expect(button.classes).toEqual(expect.arrayContaining(["min-h-8", "max-md:min-h-11"]));
  });

  it("has no box on a line of text, and a thumb's reach on a phone", () => {
    const button = render(
      <Button variant="ghost" size="inline">
        more
      </Button>,
    ).slot("button");
    expect(button.classes).toEqual(expect.arrayContaining(["px-0", "tap-target"]));
    expect(button.classes).not.toContain("min-h-11");
    // Words in a sentence, set as the sentence is.
    expect(button.classes).not.toContain("uppercase");
  });
});
