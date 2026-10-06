import type { Game, GameSide, GameStatus } from "@yogan-hockey/schemas";
import { describe, expect, it } from "vitest";
import { liveGame, nextGame, nextGamePick, scheduleView } from "./team-schedule";

const side = (id: string, abbreviation: string, score = 0, winner = false): GameSide => ({
  id,
  abbreviation,
  name: abbreviation,
  shortName: abbreviation,
  location: abbreviation,
  color: null,
  logo: null,
  logoDark: null,
  score,
  winner,
  record: null,
});

const TOR = "21";

/** A game between Toronto and one opponent: `at` is where Toronto plays it. */
function game(
  id: string,
  startTime: string,
  status: GameStatus,
  at: "home" | "away",
  score: [toronto: number, opponent: number] = [0, 0],
  detail = status === "final" ? "Final" : "",
): Game {
  const toronto = side(TOR, "TOR", score[0], status === "final" && score[0] > score[1]);
  const opponent = side("10", "MTL", score[1], status === "final" && score[1] > score[0]);
  return {
    id,
    startTime,
    season: 2027,
    seasonType: 2,
    status,
    period: status === "scheduled" ? 0 : 3,
    clock: "0:00",
    detail,
    home: at === "home" ? toronto : opponent,
    away: at === "home" ? opponent : toronto,
    venue: null,
    broadcasts: [],
  };
}

const schedule = (games: Game[]) => ({ teamId: TOR, season: "2026-27", games });

describe("a team's schedule", () => {
  it("lists the games still to play in the schedule's order, each against its opponent", () => {
    const { upcoming } = scheduleView(
      schedule([
        game("3", "2026-10-06T23:00:00Z", "scheduled", "home"),
        game("4", "2026-10-09T02:00:00Z", "scheduled", "away"),
      ]),
    );
    expect(upcoming.map((row) => [row.game.id, row.home, row.opponent.abbreviation])).toEqual([
      ["3", true, "MTL"],
      ["4", false, "MTL"],
    ]);
  });

  it("lists the results newest first, with the score from the team's side", () => {
    const { results } = scheduleView(
      schedule([
        game("1", "2026-09-29T23:00:00Z", "final", "home", [2, 3]),
        game("2", "2026-09-30T23:30:00Z", "final", "away", [4, 1]),
        game("3", "2026-10-06T23:00:00Z", "scheduled", "home"),
      ]),
    );
    expect(
      results.map((row) => [row.game.id, row.home, row.won, row.teamScore, row.opponentScore]),
    ).toEqual([
      ["2", false, true, 4, 1],
      ["1", true, false, 2, 3],
    ]);
  });

  it("says when a result needed overtime or a shootout", () => {
    const { results } = scheduleView(
      schedule([
        game("1", "2026-09-29T23:00:00Z", "final", "home", [2, 3], "Final"),
        game("2", "2026-09-30T23:00:00Z", "final", "home", [2, 3], "Final/OT"),
        game("3", "2026-10-01T23:00:00Z", "final", "home", [4, 3], "Final/SO"),
        game("4", "2026-10-02T23:00:00Z", "final", "home", [4, 3], "Final/2OT"),
      ]),
    );
    expect(results.map((row) => row.extraTime)).toEqual(["2OT", "SO", "OT", null]);
  });

  it("keeps a game in progress with the games still to play, and a postponed one apart", () => {
    const { upcoming, postponed, results } = scheduleView(
      schedule([
        game("1", "2026-10-01T23:00:00Z", "postponed", "home"),
        game("2", "2026-10-06T23:00:00Z", "live", "home", [1, 0]),
        game("3", "2026-10-09T23:00:00Z", "scheduled", "away"),
      ]),
    );
    expect(upcoming.map((row) => [row.game.id, row.game.status])).toEqual([
      ["2", "live"],
      ["3", "scheduled"],
    ]);
    expect(postponed.map((row) => row.game.id)).toEqual(["1"]);
    expect(results).toEqual([]);
  });

  it("counts the results as wins and losses", () => {
    const view = scheduleView(
      schedule([
        game("1", "2026-09-29T23:00:00Z", "final", "home", [2, 3]),
        game("2", "2026-09-30T23:30:00Z", "final", "away", [4, 1]),
        game("3", "2026-10-03T23:00:00Z", "final", "home", [2, 3], "Final/OT"),
      ]),
    );
    expect(view.wins).toBe(1);
    expect(view.losses).toBe(2);
  });

  it("is empty for a team with no games", () => {
    expect(scheduleView(schedule([]))).toEqual({
      upcoming: [],
      postponed: [],
      results: [],
      wins: 0,
      losses: 0,
    });
  });
});

describe("whether the team is playing now", () => {
  const slate = [
    game("8", "2026-10-06T23:00:00Z", "live", "away", [1, 0]),
    { ...game("9", "2026-10-06T23:00:00Z", "live", "home"), home: side("1", "BOS") },
  ];

  it("finds the team's game in progress on today's slate, home or away", () => {
    expect(liveGame(TOR, slate)?.id).toBe("8");
    expect(liveGame("10", slate)?.id).toBe("8");
  });

  it("finds nothing for a team that is not playing", () => {
    expect(liveGame("30", slate)).toBeNull();
    expect(liveGame(TOR, [])).toBeNull();
  });

  it("does not count a game yet to start or already over", () => {
    expect(liveGame(TOR, [game("8", "2026-10-06T23:00:00Z", "scheduled", "home")])).toBeNull();
    expect(liveGame(TOR, [game("8", "2026-10-06T23:00:00Z", "final", "home", [2, 1])])).toBeNull();
  });
});

describe("the team's next game", () => {
  // 7:00 PM Eastern on 6 October.
  const next = game("8", "2026-10-06T23:00:00Z", "scheduled", "home");
  const slate = (date: string | null, ...games: Game[]) => ({ date, games });

  it("is the game ESPN lists as next, while it is still to be played", () => {
    expect(nextGame(next, slate("2026-10-06", next))?.id).toBe("8");
    // A game on a later day is not on today's slate.
    expect(nextGame(next, slate("2026-10-05"))?.id).toBe("8");
    // The Scoreboard has not polled yet.
    expect(nextGame(next, slate(null))?.id).toBe("8");
  });

  it("is none when the team has no next game", () => {
    expect(nextGame(null, slate("2026-10-06"))).toBeNull();
  });

  it("is none once that game has started, which the cached team page learns late", () => {
    expect(nextGame(next, slate("2026-10-06", { ...next, status: "live" }))).toBeNull();
    expect(nextGame(next, slate("2026-10-06", { ...next, status: "final" }))).toBeNull();
    expect(nextGame({ ...next, status: "live" }, slate("2026-10-06"))).toBeNull();
  });

  it("is none once the Scoreboard has moved on to a later day than the game's", () => {
    expect(nextGame(next, slate("2026-10-07"))).toBeNull();
  });

  it("counts a late game on the day it starts in Eastern time, not in UTC", () => {
    // 10:00 PM Eastern on 8 October is already the 9th in UTC.
    const late = game("9", "2026-10-09T02:00:00Z", "scheduled", "away");
    expect(nextGame(late, slate("2026-10-08"))?.id).toBe("9");
    expect(nextGame(late, slate("2026-10-09"))).toBeNull();
  });
});

describe("the pick on the team's next game", () => {
  const next = game("8", "2026-10-06T23:00:00Z", "scheduled", "home");
  const other = game("7", "2026-10-06T23:00:00Z", "scheduled", "away");

  it("is the slate's line for that game, a made pick or a pending one", () => {
    expect(nextGamePick(next, { "8": "TOR 58%" }, [other, next])).toBe("TOR 58%");
    expect(nextGamePick(next, { "8": "pick pending" }, [next])).toBe("pick pending");
  });

  it("is nothing for a game with no line: a failed Prediction, or picks that were not read", () => {
    expect(nextGamePick(next, { "7": "NSH 55%" }, [other, next])).toBeUndefined();
    expect(nextGamePick(next, {}, [next])).toBeUndefined();
  });

  it("is nothing for a game that is not on today's slate, whatever the picks say", () => {
    expect(nextGamePick(next, { "8": "TOR 58%" }, [other])).toBeUndefined();
    expect(nextGamePick(next, { "8": "TOR 58%" }, [])).toBeUndefined();
  });
});
