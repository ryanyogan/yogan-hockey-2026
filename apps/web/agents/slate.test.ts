import { getScoreboard } from "@yogan-hockey/espn";
import { beforeAll, expect, test, vi } from "vitest";
import { dayAfter, missedDates, scoreboardGame, slateTransitions } from "./slate";

// The recorded slate of 2026-10-03, where every game is final.
const FINALS = "2026-10-03";

beforeAll(() => {
  vi.stubEnv("ESPN_FIXTURES", "1");
});

test("a game seen for the first time already final is both first seen and gone final", async () => {
  const slate = await getScoreboard(FINALS);
  const [game] = slate.games;

  const transitions = slateTransitions([], slate);

  expect(transitions).toHaveLength(slate.games.length * 2);
  expect(transitions.slice(0, 2)).toEqual([
    { kind: "first-seen", game },
    { kind: "went-final", game },
  ]);
});

test("a game that was live and is now final has gone final, carrying the whole game", async () => {
  const slate = await getScoreboard(FINALS);
  const previous = slate.games.map(scoreboardGame);
  const [first] = previous;
  if (!first) throw new Error("The recorded slate has no games");
  previous[0] = { ...first, status: "live" };

  expect(slateTransitions(previous, slate)).toEqual([{ kind: "went-final", game: slate.games[0] }]);
});

test("a slate with nothing new and nothing newly final has no transitions", async () => {
  const slate = await getScoreboard(FINALS);

  expect(slateTransitions(slate.games.map(scoreboardGame), slate)).toEqual([]);
});

test("a scheduled game seen for the first time is first seen only", async () => {
  const slate = await getScoreboard();

  const transitions = slateTransitions([], slate);

  expect(transitions.map((transition) => transition.kind)).toEqual(
    slate.games.map(() => "first-seen"),
  );
});

test("the missed dates run from the last slate seen to yesterday, oldest first", () => {
  expect(missedDates("2026-10-30", "2026-11-02", 30)).toEqual([
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
  ]);
  expect(missedDates("2026-11-02", "2026-11-02", 30)).toEqual([]);
  expect(missedDates("2026-11-03", "2026-11-02", 30)).toEqual([]);
});

test("a long gap gives only as many dates as the limit, the oldest ones", () => {
  const dates = missedDates("2026-06-01", "2026-10-06", 30);

  expect(dates).toHaveLength(30);
  expect(dates[0]).toBe("2026-06-01");
  expect(dates[29]).toBe("2026-06-30");
});

test("the day after the last of a month or a year is the first of the next", () => {
  expect(dayAfter("2028-02-28")).toBe("2028-02-29");
  expect(dayAfter("2026-12-31")).toBe("2027-01-01");
});
