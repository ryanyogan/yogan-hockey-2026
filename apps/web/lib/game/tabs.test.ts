import { expect, test } from "vitest";
import { gameTabLinks, shownGameTab } from "./tabs";

test("a game with a pick has three tabs, the plays at the page's own address", () => {
  expect(gameTabLinks("/nhl/games/1", true)).toEqual([
    { value: "plays", label: "plays", href: "/nhl/games/1" },
    { value: "scoring", label: "scoring", href: "/nhl/games/1?tab=scoring" },
    { value: "pick", label: "the pick", href: "/nhl/games/1?tab=pick" },
  ]);
});

test("a game with no pick has no tab for one, and an address that names it shows the plays", () => {
  expect(gameTabLinks("/nhl/games/1", false).map((tab) => tab.value)).toEqual(["plays", "scoring"]);
  expect(shownGameTab("pick", false)).toBe("plays");
  expect(shownGameTab("pick", true)).toBe("pick");
  expect(shownGameTab("scoring", false)).toBe("scoring");
});
