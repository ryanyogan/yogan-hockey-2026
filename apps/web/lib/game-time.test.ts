import { describe, expect, it } from "vitest";
import { clockTime, gameDay, gameTime, NHL_TIME_ZONE, slateDay } from "./game-time";

// Nashville at Toronto, 7:00 PM in Toronto on Tuesday 6 October 2026.
const START = "2026-10-06T23:00:00.000Z";
// Toronto at Vegas, 10:00 PM Eastern on Thursday: already Friday in UTC.
const LATE = "2026-10-09T02:00:00.000Z";

describe("a game's start, as a schedule shows it", () => {
  it("is the day and the time in the zone asked for", () => {
    expect(gameDay(START, "America/Toronto")).toBe("Tue Oct 6");
    expect(gameTime(START, "America/Toronto")).toBe("7:00 PM");
    expect(gameTime(START, "America/Chicago")).toBe("6:00 PM");
    expect(gameTime(START, "America/Los_Angeles")).toBe("4:00 PM");
  });

  it("puts a late game on the day the visitor sees it start", () => {
    expect(gameDay(LATE, "America/Toronto")).toBe("Thu Oct 8");
    expect(gameDay(LATE, "Europe/Berlin")).toBe("Fri Oct 9");
    expect(gameTime(LATE, "Europe/Berlin")).toBe("4:00 AM");
  });

  it("is Eastern time in the NHL's own zone, where the server writes it", () => {
    expect(gameTime(LATE, NHL_TIME_ZONE)).toBe("10:00 PM");
    expect(gameDay(LATE, NHL_TIME_ZONE)).toBe("Thu Oct 8");
  });
});

describe("the moment the Scoreboard last heard from ESPN", () => {
  it("is to the second on a 24-hour clock, in the zone asked for", () => {
    expect(clockTime("2026-10-07T00:14:07.000Z", NHL_TIME_ZONE)).toBe("20:14:07");
    expect(clockTime("2026-10-07T00:14:07.000Z", "America/Chicago")).toBe("19:14:07");
    // After the clocks go back, and just past midnight: "00", never "24".
    expect(clockTime("2026-11-11T05:03:09.000Z", NHL_TIME_ZONE)).toBe("00:03:09");
  });
});

describe("a slate's date", () => {
  it("is the calendar day it names, whatever zone reads it", () => {
    expect(slateDay("2026-10-06")).toBe("Tue Oct 6");
    expect(slateDay("2027-01-01")).toBe("Fri Jan 1");
  });
});
