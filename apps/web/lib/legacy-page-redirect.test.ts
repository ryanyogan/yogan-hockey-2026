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

test("an old team tab link goes to the tab's own page, its query kept", () => {
  expect(legacyPageLocation(new URL("https://hockey.test/nhl/teams/21?tab=roster"))).toBe(
    "https://hockey.test/nhl/teams/21/roster?tab=roster",
  );
  expect(legacyPageLocation(new URL("https://hockey.test/nhl/teams/21?tab=stats&ref=mail"))).toBe(
    "https://hockey.test/nhl/teams/21/stats?tab=stats&ref=mail",
  );
  for (const path of [
    "/nhl/teams/21",
    "/nhl/teams/21?tab=schedule",
    "/nhl/teams/21?tab=bogus",
    "/nhl/teams/21/roster?tab=roster",
    "/nhl?tab=teams",
  ])
    expect(legacyPageLocation(new URL(`https://hockey.test${path}`))).toBeNull();
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

test("the rest of the query string is kept", () => {
  expect(legacyPageLocation(new URL("https://hockey.test/players/7?games=all&from=home"))).toBe(
    "https://hockey.test/players/7/games?from=home",
  );
});
