import type { ScoreboardGame, ScoreboardState } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import {
  gameHref,
  gameStatusLine,
  hasScore,
  newFinals,
  slateDateLabel,
  slateSections,
  tickerGames,
  updatedLabel,
} from "./scoreboard-view";

function side(abbreviation: string, score = 0, winner = false): ScoreboardGame["home"] {
  return {
    id: abbreviation,
    abbreviation,
    shortName: abbreviation,
    logo: null,
    logoDark: null,
    score,
    winner,
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
    home: side("MTL"),
    away: side("TOR"),
    ...over,
  };
}

const live = (id: string, period: number, clock: string, over: Partial<ScoreboardGame> = {}) =>
  game(id, { status: "live", period, clock, ...over });

test("a game still to be played reads as its start time in Eastern time", () => {
  expect(gameStatusLine(game("1"))).toBe("7:00 PM ET");
  expect(gameStatusLine(game("2", { startTime: "2026-10-07T02:30:00Z" }))).toBe("10:30 PM ET");
  // After the clocks go back: 7:00 PM Eastern is midnight UTC.
  expect(gameStatusLine(game("3", { startTime: "2026-11-11T00:00:00Z" }))).toBe("7:00 PM ET");
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

const state = (games: ScoreboardGame[]): ScoreboardState => ({
  date: "2026-10-06",
  games,
  updatedAt: "2026-10-07T00:14:07.000Z",
});

test("a game that ends between two states is a new final; one already over is not", () => {
  const before = state([live("a", 3, "0:10"), game("b", { status: "final", period: 3 })]);

  expect(newFinals(before, before)).toEqual([]);
  expect(
    newFinals(before, state([live("a", 3, "0:02"), game("b", { status: "final", period: 3 })])),
  ).toEqual([]);
  expect(
    newFinals(
      before,
      state([game("a", { status: "final", period: 3 }), game("b", { status: "final", period: 3 })]),
    ),
  ).toEqual(["a"]);
});

test("a final on a slate the page has not shown before is not a new final", () => {
  const yesterday = { ...state([live("a", 3, "0:10")]), date: "2026-10-05" };
  const today = state([game("z", { status: "final", period: 3 })]);

  expect(newFinals(yesterday, today)).toEqual([]);
  // A game that joins today's slate already over did end unseen, so the page's data is stale.
  expect(newFinals(state([]), today)).toEqual(["z"]);
});

test("every game links to its own page, and shows a score only once it has started", () => {
  expect(gameHref(game("401892449"))).toBe("/nhl/games/401892449");
  expect(hasScore(game("1"))).toBe(false);
  expect(hasScore(live("2", 1, "20:00"))).toBe(true);
  expect(hasScore(game("3", { status: "final", period: 3 }))).toBe(true);
  expect(hasScore(game("4", { status: "postponed" }))).toBe(false);
});

test("a slate's date reads as a day of the week and a date", () => {
  expect(slateDateLabel("2026-10-06")).toBe("Tue, Oct 6");
  expect(slateDateLabel("2027-01-01")).toBe("Fri, Jan 1");
});

test("the updated time is Eastern, to the second, and absent before the first poll", () => {
  expect(updatedLabel("2026-10-07T00:14:07.000Z")).toBe("20:14:07 ET");
  expect(updatedLabel("2026-11-11T05:03:09.000Z")).toBe("00:03:09 ET");
  expect(updatedLabel(null)).toBeNull();
});
