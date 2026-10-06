import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import {
  gameHref,
  gameStatusLine,
  gameWhere,
  hasScore,
  heardAtFrom,
  laterOf,
  slateSections,
  stripReach,
  tickerGames,
  wheelScrollLeft,
} from "./scoreboard-view";

function side(abbreviation: string, score = 0, winner = false): ScoreboardGame["home"] {
  return {
    id: abbreviation,
    abbreviation,
    logo: null,
    logoDark: null,
    score,
    winner,
    record: null,
  };
}

function game(id: string, over: Partial<ScoreboardGame> = {}): ScoreboardGame {
  return {
    id,
    // 7:00 PM in Toronto and New York, 4:00 PM in Vancouver.
    startTime: "2026-10-06T23:00:00Z",
    seasonType: 2,
    status: "scheduled",
    period: 0,
    clock: "0:00",
    detail: "10/6 - 7:00 PM EDT",
    venue: null,
    home: side("MTL"),
    away: side("TOR"),
    ...over,
  };
}

const live = (id: string, period: number, clock: string, over: Partial<ScoreboardGame> = {}) =>
  game(id, { status: "live", period, clock, ...over });

test("a game still to be played has no status line: its start time stands in for one", () => {
  expect(gameStatusLine(game("1"))).toBeNull();
});

test("a game in progress reads as its period and the time left in it", () => {
  expect(gameStatusLine(live("1", 1, "4:10"))).toBe("1st 4:10");
  expect(gameStatusLine(live("2", 2, "12:34"))).toBe("2nd 12:34");
  expect(gameStatusLine(live("3", 3, "0:42"))).toBe("3rd 0:42");
  expect(gameStatusLine(live("4", 4, "3:21"))).toBe("OT 3:21");
});

test("an intermission reads as the end of the period just played", () => {
  expect(gameStatusLine(live("1", 1, "0:00"))).toBe("end 1st");
  expect(gameStatusLine(live("2", 3, "0:00"))).toBe("end 3rd");
  expect(gameStatusLine(live("3", 4, "0:00"))).toBe("end OT");
  expect(gameStatusLine(live("4", 2, "00:00"))).toBe("end 2nd");
  expect(gameStatusLine(live("5", 2, "0.0"))).toBe("end 2nd");
  // The last seconds of a period are still play.
  expect(gameStatusLine(live("6", 2, "0:05"))).toBe("2nd 0:05");
  expect(gameStatusLine(live("7", 2, "20:00"))).toBe("2nd 20:00");
});

test("a game ESPN calls live before it has a period reads as live", () => {
  expect(gameStatusLine(live("1", 0, "0:00"))).toBe("live");
});

test("a shootout has no clock, and a playoff game has no shootout", () => {
  expect(gameStatusLine(live("1", 5, "0:00"))).toBe("SO");
  expect(gameStatusLine(live("2", 5, "11:02", { seasonType: 3 }))).toBe("2OT 11:02");
  expect(gameStatusLine(live("3", 6, "0:00", { seasonType: 3 }))).toBe("end 3OT");
});

test("a finished game reads as final, with how far past regulation it went", () => {
  const final = (period: number, seasonType = 2) =>
    game("1", { status: "final", period, seasonType });
  expect(gameStatusLine(final(3))).toBe("final");
  expect(gameStatusLine(final(4))).toBe("final/OT");
  expect(gameStatusLine(final(5))).toBe("final/SO");
  expect(gameStatusLine(final(6, 3))).toBe("final/3OT");
  // A game seen only after it ended can arrive without its period.
  expect(gameStatusLine(final(0))).toBe("final");
});

test("a game that will not be played today says why in ESPN's word", () => {
  expect(gameStatusLine(game("1", { status: "postponed", detail: "Postponed" }))).toBe("postponed");
  expect(gameStatusLine(game("2", { status: "postponed", detail: "Canceled" }))).toBe("canceled");
  expect(gameStatusLine(game("3", { status: "postponed", detail: "" }))).toBe("postponed");
});

const SLATE = [
  game("late", { startTime: "2026-10-07T02:00:00Z" }),
  game("done-late", { status: "final", period: 3, startTime: "2026-10-06T21:00:00Z" }),
  live("on-late", 1, "10:00", { startTime: "2026-10-06T23:30:00Z" }),
  game("off", { status: "postponed", detail: "Postponed", startTime: "2026-10-06T17:00:00Z" }),
  game("early"),
  live("on-early", 3, "2:00", { startTime: "2026-10-06T21:00:00Z" }),
  game("done-early", { status: "final", period: 4, startTime: "2026-10-06T17:00:00Z" }),
  game("early-too"),
];

const ids = (games: ScoreboardGame[]) => games.map((each) => each.id);

test("a slate is split into games in progress, to come, finished and postponed", () => {
  const sections = slateSections(SLATE);

  expect(ids(sections.live)).toEqual(["on-early", "on-late"]);
  expect(ids(sections.upcoming)).toEqual(["early", "early-too", "late"]);
  expect(ids(sections.final)).toEqual(["done-early", "done-late"]);
  expect(ids(sections.postponed)).toEqual(["off"]);
});

test("the ticker leads with what is on, then what is to come, then what is over", () => {
  expect(ids(tickerGames(SLATE))).toEqual([
    "on-early",
    "on-late",
    "early",
    "early-too",
    "late",
    "done-early",
    "done-late",
    "off",
  ]);
  expect(tickerGames([])).toEqual([]);
});

test("a page was last heard from at the later of the state's change and the last quiet poll", () => {
  expect(laterOf("2026-10-07T00:14:07.000Z", "2026-10-07T00:19:07.000Z")).toBe(
    "2026-10-07T00:19:07.000Z",
  );
  expect(laterOf("2026-10-07T00:19:37.000Z", "2026-10-07T00:19:07.000Z")).toBe(
    "2026-10-07T00:19:37.000Z",
  );
  expect(laterOf(null, "2026-10-07T00:19:07.000Z")).toBe("2026-10-07T00:19:07.000Z");
  expect(laterOf("2026-10-07T00:14:07.000Z", null)).toBe("2026-10-07T00:14:07.000Z");
  expect(laterOf(null, null)).toBeNull();
});

test("only the Scoreboard's own word that it heard from ESPN carries a time", () => {
  const at = "2026-10-07T00:19:07.000Z";
  expect(heardAtFrom(JSON.stringify({ type: "scoreboard_heard", at }))).toBe(at);
  expect(heardAtFrom(JSON.stringify({ type: "cf_agent_mcp_servers", at }))).toBeNull();
  expect(heardAtFrom(JSON.stringify({ type: "scoreboard_heard" }))).toBeNull();
  expect(heardAtFrom(JSON.stringify({ type: "scoreboard_heard", at: "lately" }))).toBeNull();
  expect(heardAtFrom("not json")).toBeNull();
  expect(heardAtFrom(new ArrayBuffer(4))).toBeNull();
});

// A ticker 300 wide holding 1000 of entries, somewhere in the middle.
const strip = { scrollLeft: 200, scrollWidth: 1000, clientWidth: 300 };
const wheel = { deltaX: 0, deltaY: 0, deltaMode: 0, shiftKey: false, ctrlKey: false };

test("a vertical wheel moves the ticker sideways, down to the right and up to the left", () => {
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: 120 })).toBe(320);
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: -120 })).toBe(80);
  // A wheel that reports lines, as Firefox does: three lines of 16px.
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: 3, deltaMode: 1 })).toBe(248);
  // A wheel that reports pages: one width of the strip.
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: 1, deltaMode: 2 })).toBe(500);
});

test("the wheel stops at the ticker's ends, and from there it scrolls the page again", () => {
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: 5000 })).toBe(700);
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: -5000 })).toBe(0);
  expect(wheelScrollLeft({ ...strip, scrollLeft: 700 }, { ...wheel, deltaY: 120 })).toBeNull();
  expect(wheelScrollLeft({ ...strip, scrollLeft: 0 }, { ...wheel, deltaY: -120 })).toBeNull();
  // The slow tail of a trackpad's glide still belongs to the strip while it has room to move.
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: 0.4 })).toBe(200.4);
  // A browser zoomed in reports a fraction short of the end.
  expect(wheelScrollLeft({ ...strip, scrollLeft: 699.5 }, { ...wheel, deltaY: 120 })).toBeNull();
});

test("the wheel is left alone when the ticker fits or the gesture is not a plain vertical one", () => {
  const fits = { scrollLeft: 0, scrollWidth: 300, clientWidth: 300 };
  expect(wheelScrollLeft(fits, { ...wheel, deltaY: 120 })).toBeNull();
  // A trackpad swiping sideways already scrolls the strip.
  expect(wheelScrollLeft(strip, { ...wheel, deltaX: 40, deltaY: 10 })).toBeNull();
  // Shift makes a browser scroll sideways itself; control is a zoom.
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: 120, shiftKey: true })).toBeNull();
  expect(wheelScrollLeft(strip, { ...wheel, deltaY: 120, ctrlKey: true })).toBeNull();
  expect(wheelScrollLeft(strip, wheel)).toBeNull();
});

// Entries 100 wide, side by side from the strip's start.
const entries = (count: number) =>
  Array.from({ length: count }, (_, at) => ({ left: at * 100, right: at * 100 + 100 }));

test("a strip says how many of its entries are not wholly in view, and which way they lie", () => {
  // 300 wide at its start, holding ten: three show, seven lie to the right.
  const atStart = { scrollLeft: 0, scrollWidth: 1000, clientWidth: 300 };
  expect(stripReach(atStart, entries(10))).toEqual({ before: false, after: true, hidden: 7 });
  // Part way along, an entry cut by either edge counts as hidden.
  const midway = { scrollLeft: 250, scrollWidth: 1000, clientWidth: 300 };
  expect(stripReach(midway, entries(10))).toEqual({ before: true, after: true, hidden: 8 });
  const atEnd = { scrollLeft: 700, scrollWidth: 1000, clientWidth: 300 };
  expect(stripReach(atEnd, entries(10))).toEqual({ before: true, after: false, hidden: 7 });
});

test("a strip that fits hides nothing, to within the pixel a zoomed browser is out by", () => {
  const fits = { scrollLeft: 0, scrollWidth: 300, clientWidth: 300 };
  expect(stripReach(fits, entries(3))).toEqual({ before: false, after: false, hidden: 0 });
  expect(stripReach(fits, [])).toEqual({ before: false, after: false, hidden: 0 });
  const zoomed = { scrollLeft: 0.4, scrollWidth: 300.6, clientWidth: 300 };
  expect(stripReach(zoomed, entries(3))).toEqual({ before: false, after: false, hidden: 0 });
});

test("every game links to its own page, and shows a score only once it has started", () => {
  expect(gameHref(game("401892449"))).toBe("/nhl/games/401892449");
  expect(hasScore(game("1"))).toBe(false);
  expect(hasScore(live("2", 1, "20:00"))).toBe(true);
  expect(hasScore(game("3", { status: "final", period: 3 }))).toBe(true);
  expect(hasScore(game("4", { status: "postponed" }))).toBe(false);
});

test("a game's note says where it is played and where it is shown", () => {
  expect(gameWhere({ venue: "Scotiabank Arena", broadcasts: ["ESPN+", "TNT"] })).toBe(
    "Scotiabank Arena · ESPN+, TNT",
  );
  expect(gameWhere({ venue: "Scotiabank Arena", broadcasts: [] })).toBe("Scotiabank Arena");
  expect(gameWhere({ venue: null, broadcasts: ["ESPN+"] })).toBe("ESPN+");
  // State stored by the Scoreboard before it carried broadcasts has none.
  expect(gameWhere({ venue: null })).toBe("");
});
