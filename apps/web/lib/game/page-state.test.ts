import type { Game, GameHeader } from "@yogan-hockey/schemas";
import { beforeAll, describe, expect, it } from "vitest";
import { gamePhase, isGameId, streamReading, streamStarts } from "./page-state";
import { play, recordedShootout } from "./test-plays";

let final: GameHeader;
beforeAll(async () => {
  final = (await recordedShootout()).header;
});

const live = (over: Partial<GameHeader> = {}): GameHeader => ({
  ...final,
  status: "live",
  period: 2,
  clock: "0:00",
  detail: "In Progress",
  ...over,
});
const onScoreboard = (over: Partial<Game> = {}): Game => ({ ...live(), clock: "12:34", ...over });

describe("isGameId", () => {
  it("takes ESPN's event ids and nothing else", () => {
    expect(isGameId("401803652")).toBe(true);
    expect(isGameId("abc")).toBe(false);
    expect(isGameId("")).toBe(false);
    expect(isGameId("40180 3652")).toBe(false);
  });
});

describe("streamStarts", () => {
  it("opens a game that was live when the page was read as the Game Stream", () => {
    expect(streamStarts("live", undefined)).toBe(true);
  });

  it("leaves a scheduled game without a socket while the Scoreboard has it still to come", () => {
    expect(streamStarts("scheduled", "scheduled")).toBe(false);
    expect(streamStarts("scheduled", undefined)).toBe(false);
  });

  it("switches a scheduled page when the Scoreboard reports the game live", () => {
    expect(streamStarts("scheduled", "live")).toBe(true);
  });

  it("switches a scheduled page left open past the final, so the Agent can say how it ended", () => {
    expect(streamStarts("scheduled", "final")).toBe(true);
  });

  it("never opens a socket for a game that was over or called off when the page was read", () => {
    expect(streamStarts("final", "final")).toBe(false);
    expect(streamStarts("postponed", "live")).toBe(false);
  });

  it("leaves a scheduled page alone when the Scoreboard says the game is postponed", () => {
    expect(streamStarts("scheduled", "postponed")).toBe(false);
  });
});

describe("gamePhase", () => {
  it("is the matchup for a game still to come, and for one called off", () => {
    expect(gamePhase("scheduled")).toBe("scheduled");
    expect(gamePhase("postponed")).toBe("scheduled");
  });

  it("is the Game Stream while the game is live", () => {
    expect(gamePhase("live")).toBe("live");
  });

  it("is the finished game once it is final", () => {
    expect(gamePhase("final")).toBe("finished");
  });
});

describe("streamReading", () => {
  const shot = play({ period: 2, clock: "7:26" });

  it("says nothing of its own for a finished game: the header's wording stands", () => {
    expect(streamReading({ header: final, plays: [shot], delayed: false })).toEqual({});
  });

  it("shows the period break through an intermission", () => {
    const end = play({ type: "period-end", period: 2, periodText: "2nd" });
    expect(streamReading({ header: live(), plays: [shot, end], delayed: false })).toEqual({
      status: "End of 2nd",
    });
  });

  it("names the break after overtime in the regular season", () => {
    const end = play({ type: "period-end", period: 4 });
    expect(
      streamReading({ header: live({ period: 4 }), plays: [end], delayed: false }).status,
    ).toBe("End of OT");
  });

  it("warns when the Agent reports a stall, over whatever else is shown", () => {
    const end = play({ type: "period-end", period: 1 });
    expect(streamReading({ header: live({ period: 1 }), plays: [end], delayed: true })).toEqual({
      status: "End of 1st",
      notice: "Updates delayed",
    });
    expect(streamReading({ header: final, plays: [], delayed: true })).toEqual({
      notice: "Updates delayed",
    });
  });

  it("says so while the socket to the Game Agent is down, over a stall", () => {
    const end = play({ type: "period-end", period: 1 });
    const header = live({ period: 1 });
    expect(streamReading({ header, plays: [end], delayed: false, reconnecting: true })).toEqual({
      status: "End of 1st",
      notice: "Reconnecting",
    });
    expect(streamReading({ header, plays: [end], delayed: true, reconnecting: true }).notice).toBe(
      "Reconnecting",
    );
  });

  it("says nothing of a dropped socket once the game is over", () => {
    expect(streamReading({ header: final, plays: [], delayed: false, reconnecting: true })).toEqual(
      {},
    );
  });

  it("keeps the header's own clock when it has one", () => {
    const header = live({ clock: "6:51" });
    expect(
      streamReading({ header, plays: [shot], delayed: false, scoreboard: onScoreboard() }),
    ).toEqual({});
  });

  it("takes the Scoreboard's clock when the header has none", () => {
    expect(
      streamReading({ header: live(), plays: [shot], delayed: false, scoreboard: onScoreboard() }),
    ).toEqual({ status: "2nd 12:34" });
  });

  it("shows the period alone when no clock can be trusted", () => {
    const reading = (scoreboard?: Game) =>
      streamReading({ header: live(), plays: [shot], delayed: false, scoreboard });
    expect(reading()).toEqual({ status: "2nd" });
    // The Scoreboard is a period behind or ahead, or does not have the game live.
    expect(reading(onScoreboard({ period: 3 }))).toEqual({ status: "2nd" });
    expect(reading(onScoreboard({ status: "final" }))).toEqual({ status: "2nd" });
  });

  it("leaves a shootout, which has no clock, to the header", () => {
    const header = live({ period: 5 });
    expect(streamReading({ header, plays: [play({ period: 5 })], delayed: false })).toEqual({});
  });
});
