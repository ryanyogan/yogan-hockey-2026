import { expect, test } from "vitest";
import { legacyPageLocation } from "./legacy-page-redirect";

test("old game and player links consume their selector and retain unrelated queries", () => {
  expect(legacyPageLocation(new URL("https://hockey.test/nhl/games/1?tab=scoring"))).toBe(
    "https://hockey.test/nhl/games/1/scoring",
  );
  expect(legacyPageLocation(new URL("https://hockey.test/nhl/games/1?tab=pick&ref=mail"))).toBe(
    "https://hockey.test/nhl/games/1/pick?ref=mail",
  );
  expect(legacyPageLocation(new URL("https://hockey.test/players/7?games=all"))).toBe(
    "https://hockey.test/players/7/games",
  );
  expect(legacyPageLocation(new URL("https://hockey.test/players/7?games=all&ref=mail"))).toBe(
    "https://hockey.test/players/7/games?ref=mail",
  );
});

test("canonical, unknown and ambiguous selectors do not redirect", () => {
  for (const path of [
    "/nhl/games/1/scoring?tab=scoring",
    "/players/7/games",
    "/players/7?games=latest",
    "/nhl/games/1?tab=plays",
    "/nhl/games/1?tab=bogus",
    "/players/7?games=all&games=latest",
    "/family/rylan?tab=results",
  ])
    expect(legacyPageLocation(new URL(`https://hockey.test${path}`))).toBeNull();
});

test("RSC links retain their transport suffix and cache buster", () => {
  expect(
    legacyPageLocation(new URL("https://hockey.test/nhl/games/1.rsc?tab=scoring&_rsc=abc")),
  ).toBe("https://hockey.test/nhl/games/1/scoring.rsc?_rsc=abc");
  expect(legacyPageLocation(new URL("https://hockey.test/players/7?games=all&_rsc=abc"))).toBe(
    "https://hockey.test/players/7/games?_rsc=abc",
  );
});
