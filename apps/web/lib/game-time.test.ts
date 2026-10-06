import { describe, expect, it } from "vitest";
import { gameDay, gameTime, NHL_TIME_ZONE } from "./game-time";

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
