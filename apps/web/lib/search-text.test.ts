import { expect, test } from "vitest";
import { nhlHref, readNhlPage } from "./nhl-page";
import { readPlayersPage } from "./player-search";
import { parseSearchText, stringifySearchText } from "./search-text";

/** An address's query, read and written back as the router does with these two. */
const roundTrip = (search: string) => stringifySearchText(parseSearchText(search));

test("a search of digits, of a number's spelling or of a keyword is its text, and keeps its address", () => {
  for (const q of ["99", "1e3", "true", "null", "007", "-1", "[1]", '{"a":1}']) {
    expect(readPlayersPage(parseSearchText(`?q=${encodeURIComponent(q)}`))).toEqual({ q });
    expect(parseSearchText(stringifySearchText({ q }))).toEqual({ q });
  }
  expect(roundTrip("?q=99")).toBe("?q=99");
  expect(roundTrip("?q=1e3")).toBe("?q=1e3");
  expect(roundTrip("?q=true")).toBe("?q=true");
});

test("a name with a space or an apostrophe is read whichever way it was written", () => {
  expect(parseSearchText("?q=de+la")).toEqual({ q: "de la" });
  expect(parseSearchText("?q=de%20la")).toEqual({ q: "de la" });
  expect(parseSearchText(stringifySearchText({ q: "o'reilly & co" }))).toEqual({
    q: "o'reilly & co",
  });
});

test("a parameter given twice is a list, in order, and is written back twice", () => {
  expect(parseSearchText("?q=mar&q=mat&q=mau")).toEqual({ q: ["mar", "mat", "mau"] });
  expect(roundTrip("?q=mar&q=mat")).toBe("?q=mar&q=mat");
});

test("no parameters are no query string, and a parameter without a value is left out", () => {
  expect(parseSearchText("")).toEqual({});
  expect(stringifySearchText({})).toBe("");
  expect(stringifySearchText({ q: undefined, tab: null })).toBe("");
});

test("a parameter named for something every object has is only a parameter", () => {
  expect(parseSearchText("?__proto__=x&toString=y")).toEqual({ ["__proto__"]: "x", toString: "y" });
});

test("/nhl's tab and view answer as they did", () => {
  expect(readNhlPage(parseSearchText("?tab=teams"))).toEqual({ tab: "teams", view: "division" });
  expect(readNhlPage(parseSearchText("?view=wildcard"))).toEqual({
    tab: "standings",
    view: "wildcard",
  });
  expect(readNhlPage(parseSearchText("?tab=teams&tab=standings&view=league"))).toEqual({
    tab: "teams",
    view: "league",
  });
  expect(readNhlPage(parseSearchText("?tab=1&view=true"))).toEqual({
    tab: "standings",
    view: "division",
  });
  for (const href of ["/nhl?tab=teams", "/nhl?view=conference"]) {
    expect(`/nhl${roundTrip(href.slice(4))}`).toBe(href);
  }
  expect(nhlHref(readNhlPage(parseSearchText("?view=league")))).toBe("/nhl?view=league");
});
