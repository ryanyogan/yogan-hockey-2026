import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { describe, expect, test } from "vitest";
import {
  favoritesFirst,
  favoritesToShow,
  isFavoriteGame,
  MAX_FAVORITES,
  readFavoriteIds,
  toggleFavorite,
} from "./favorites";

describe("readFavoriteIds", () => {
  test("keeps a stored list of ids in its order", () => {
    expect(readFavoriteIds(["4024123", "3067313"])).toEqual(["4024123", "3067313"]);
  });

  test("reads the numbers an older list may hold as ids", () => {
    expect(readFavoriteIds([4024123, "21"])).toEqual(["4024123", "21"]);
  });

  test("answers no favorites for anything that is not a list", () => {
    for (const stored of [undefined, null, "4024123", 7, { players: ["1"] }, true]) {
      expect(readFavoriteIds(stored)).toEqual([]);
    }
  });

  test("drops what cannot be an id and keeps the rest", () => {
    expect(readFavoriteIds(["1", null, "", {}, ["2"], "  ", 3.5, -4, "x".repeat(65), "2"])).toEqual(
      ["1", "2"],
    );
  });

  test("lists an id once, where it first appears", () => {
    expect(readFavoriteIds(["1", "2", "1", 2])).toEqual(["1", "2"]);
  });

  test("never answers more than the most a visitor can hold", () => {
    const stored = Array.from({ length: MAX_FAVORITES + 10 }, (_, index) => String(index));
    expect(readFavoriteIds(stored)).toHaveLength(MAX_FAVORITES);
  });
});

describe("toggleFavorite", () => {
  test("adds an id after the ones already there", () => {
    expect(toggleFavorite(["1"], "2")).toEqual(["1", "2"]);
  });

  test("removes an id that is there", () => {
    expect(toggleFavorite(["1", "2", "3"], "2")).toEqual(["1", "3"]);
  });

  test("leaves the list it was given alone", () => {
    const ids = ["1"];
    toggleFavorite(ids, "2");
    expect(ids).toEqual(["1"]);
  });

  test("makes room for a new favorite by letting go of the oldest", () => {
    const full = Array.from({ length: MAX_FAVORITES }, (_, index) => String(index));
    const next = toggleFavorite(full, "new");
    expect(next).toHaveLength(MAX_FAVORITES);
    expect(next.at(-1)).toBe("new");
    expect(next).not.toContain("0");
  });
});

const game = (id: string, away: string, home: string) =>
  ({ id, away: { id: away }, home: { id: home } }) as ScoreboardGame;

describe("favoritesFirst", () => {
  const slate = [
    game("a", "1", "2"),
    game("b", "3", "21"),
    game("c", "4", "5"),
    game("d", "6", "3"),
  ];

  test("moves a favorite team's games ahead, home or away, keeping each group's order", () => {
    expect(favoritesFirst(slate, ["3"]).map((each) => each.id)).toEqual(["b", "d", "a", "c"]);
  });

  test("changes nothing without favorite teams", () => {
    expect(favoritesFirst(slate, [])).toEqual(slate);
  });

  test("leaves the list it was given alone", () => {
    favoritesFirst(slate, ["5"]);
    expect(slate.map((each) => each.id)).toEqual(["a", "b", "c", "d"]);
  });
});

test("a game is a favorite's when either side is a favorite team", () => {
  expect(isFavoriteGame(game("a", "1", "21"), ["21"])).toBe(true);
  expect(isFavoriteGame(game("a", "21", "1"), ["21"])).toBe(true);
  expect(isFavoriteGame(game("a", "1", "2"), ["21"])).toBe(false);
});

describe("favoritesToShow", () => {
  const nobody =
    (...dead: string[]) =>
    (id: string) =>
      dead.includes(id);

  test("is the oldest favorites, as many as there is room for", () => {
    expect(favoritesToShow(["1", "2", "3", "4", "5"], 4, nobody())).toEqual(["1", "2", "3", "4"]);
    expect(favoritesToShow(["1", "2"], 4, nobody())).toEqual(["1", "2"]);
  });

  test("a favorite found to be nobody gives his place to the next", () => {
    expect(favoritesToShow(["1", "2", "3", "4", "5", "6"], 4, nobody("2", "5"))).toEqual([
      "1",
      "3",
      "4",
      "6",
    ]);
  });
});
