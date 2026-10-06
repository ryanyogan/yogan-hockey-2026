import { FinalGameSchema } from "@yogan-hockey/schemas";
import { afterEach, describe, expect, test, vi } from "vitest";
import { endpoints } from "./endpoints.ts";
import { EspnParseError } from "./errors.ts";
import { loadFixture } from "./fixtures.ts";
import { translateScoreboard } from "./scoreboard.ts";

const tonight = endpoints.scoreboard();
const saturday = endpoints.scoreboard("2026-10-03");

/** ESPN's status block as recorded, with the parts under test replaced. */
type RecordedStatus = {
  period: number;
  displayClock: string;
  type: { name: string; state: string; completed: boolean; shortDetail: string };
};
type RecordedScoreboard = {
  events: { id: string; competitions: { status: RecordedStatus }[] }[];
};

/**
 * No recorded slate has a game in progress yet (see the build notes), so these take the first
 * game of a real one and change only its status.
 */
async function firstGameWithStatus(change: (status: RecordedStatus) => void) {
  const recorded = structuredClone(await loadFixture(tonight)) as RecordedScoreboard;
  const status = recorded.events[0]?.competitions[0]?.status;
  if (!status) throw new Error("the recorded scoreboard has no first game");
  change(status);
  const game = translateScoreboard(recorded).games[0];
  if (!game) throw new Error("the translated scoreboard has no first game");
  return game;
}

describe("a finished slate", () => {
  test("is dated by the request and translates every game", async () => {
    const scoreboard = translateScoreboard(await loadFixture(saturday), "2026-10-03");

    expect(scoreboard.date).toBe("2026-10-03");
    expect(scoreboard.games).toHaveLength(13);
    expect(scoreboard.games.every((game) => game.status === "final")).toBe(true);
  });

  test("a game decided in overtime", async () => {
    const scoreboard = translateScoreboard(await loadFixture(saturday), "2026-10-03");
    const game = scoreboard.games.find((candidate) => candidate.id === "401891822");

    expect(game).toMatchObject({
      startTime: "2026-10-03T23:00:00.000Z",
      status: "final",
      period: 4,
      detail: "Final/OT",
      venue: "PPG Paints Arena",
      broadcasts: ["ESPN+"],
      home: { id: "16", abbreviation: "PIT", score: 6, winner: true, record: "2-0-0" },
      away: { id: "10", abbreviation: "MTL", score: 5, winner: false, record: "1-0-1" },
    });
  });

  test("a finished game is already the permanent record's shape", async () => {
    const scoreboard = translateScoreboard(await loadFixture(saturday), "2026-10-03");
    const game = scoreboard.games.find((candidate) => candidate.id === "401891822");

    expect(FinalGameSchema.parse(game)).toEqual({
      id: "401891822",
      startTime: "2026-10-03T23:00:00.000Z",
      season: 2027,
      seasonType: 2,
      home: { id: "16", abbreviation: "PIT", name: "Pittsburgh Penguins", score: 6 },
      away: { id: "10", abbreviation: "MTL", name: "Montreal Canadiens", score: 5 },
    });
  });

  test("matches the snapshot", async () => {
    expect(translateScoreboard(await loadFixture(saturday), "2026-10-03")).toMatchSnapshot();
  });
});

describe("ESPN's current slate", () => {
  test("is dated by ESPN and holds games yet to start", async () => {
    const scoreboard = translateScoreboard(await loadFixture(tonight));

    expect(scoreboard.date).toBe("2026-10-06");
    expect(scoreboard.games[0]).toMatchObject({
      id: "401891815",
      startTime: "2026-10-06T23:00:00.000Z",
      status: "scheduled",
      period: 0,
      home: { abbreviation: "MTL", score: 0, winner: false },
      away: { abbreviation: "CAR", score: 0, winner: false },
    });
  });

  test("matches the snapshot", async () => {
    expect(translateScoreboard(await loadFixture(tonight))).toMatchSnapshot();
  });
});

describe("a current slate ESPN has not dated", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("takes the date in Eastern time, where the NHL's day turns over", () => {
    // Three in the morning UTC on the 7th is still the evening of the 6th in New York.
    vi.useFakeTimers({ now: new Date("2026-10-07T03:00:00Z") });

    expect(translateScoreboard({ events: [] })).toEqual({ date: "2026-10-06", games: [] });
  });
});

describe("game status", () => {
  test("a game ESPN reports in progress is live, with its period and clock", async () => {
    const game = await firstGameWithStatus((status) => {
      status.period = 2;
      status.displayClock = "12:34";
      status.type.state = "in";
      status.type.shortDetail = "12:34 - 2nd";
    });

    expect(game).toMatchObject({ status: "live", period: 2, clock: "12:34" });
  });

  test("comes from the state, never the status name", async () => {
    const game = await firstGameWithStatus((status) => {
      status.type.name = "STATUS_FINAL";
      status.type.state = "in";
    });

    expect(game.status).toBe("live");
  });

  test("a game that ended without being completed is postponed, not final", async () => {
    const game = await firstGameWithStatus((status) => {
      status.type.name = "STATUS_FINAL";
      status.type.state = "post";
      status.type.completed = false;
    });

    expect(game.status).toBe("postponed");
  });
});

describe("a response that is not a scoreboard", () => {
  test("is a parse error naming the endpoint", () => {
    const parse = () => translateScoreboard({ events: [{ id: 401891822 }] }, "2026-10-03");

    expect(parse).toThrow(EspnParseError);
    expect(parse).toThrow(/scoreboard\?dates=20261003/);
  });

  test("carries the endpoint and what was wrong", () => {
    try {
      translateScoreboard({ events: "none" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EspnParseError);
      expect(error).toMatchObject({ name: "EspnParseError", endpoint: "scoreboard" });
      expect((error as EspnParseError).message).toContain("events");
    }
  });
});
