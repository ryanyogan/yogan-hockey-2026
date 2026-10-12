import { expect, test } from "vitest";
import {
  MAX_SEARCH_LENGTH,
  PlayersPageSchema,
  readPlayersPage,
  unansweredSearch,
} from "./player-search";

test("the search is read from the address, trimmed and no longer than a name", () => {
  expect(readPlayersPage({})).toEqual({ q: "" });
  expect(readPlayersPage({ q: "  mar " })).toEqual({ q: "mar" });
  expect(readPlayersPage({ q: "m".repeat(80) }).q).toHaveLength(MAX_SEARCH_LENGTH);
});

test("a search the router read as a number, a boolean or null is still its text", () => {
  expect(readPlayersPage({ q: 99 })).toEqual({ q: "99" });
  expect(readPlayersPage({ q: true })).toEqual({ q: "true" });
  expect(readPlayersPage({ q: null })).toEqual({ q: "null" });
});

test("a search given twice, or as anything but text, is no search", () => {
  expect(readPlayersPage({ q: ["mar", "mat"] })).toEqual({ q: "" });
  expect(readPlayersPage({ q: { name: "mar" } })).toEqual({ q: "" });
});

test("every search the address can name is one the server function accepts", () => {
  expect(PlayersPageSchema.safeParse(readPlayersPage({ q: "m".repeat(80) })).success).toBe(true);
  expect(PlayersPageSchema.safeParse(readPlayersPage({})).success).toBe(true);
});

test("the server function refuses what is not a search", () => {
  expect(PlayersPageSchema.safeParse({ q: "m".repeat(MAX_SEARCH_LENGTH + 1) }).success).toBe(false);
  expect(PlayersPageSchema.safeParse({ q: 99 }).success).toBe(false);
  expect(PlayersPageSchema.safeParse({}).success).toBe(false);
});

test("a search that got no answer says so, unless it was too short to ask", () => {
  expect(unansweredSearch("mar")).toEqual({ status: "unavailable", query: "mar", players: [] });
  expect(unansweredSearch("m")).toEqual({ status: "idle", query: "m", players: [] });
  expect(unansweredSearch("")).toEqual({ status: "idle", query: "", players: [] });
});
