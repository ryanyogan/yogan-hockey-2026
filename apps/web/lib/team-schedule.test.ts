import type { Game, GameSide, GameStatus } from "@yogan-hockey/schemas";
import { describe, expect, it } from "vitest";
import { gameHref, liveGame, nextGame, scheduleView } from "./team-schedule";

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
  it("lists the games still to play in date order, each against its opponent", () => {
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

  it("keeps a game in progress and a postponed one with the games still to play", () => {
    const { upcoming, results } = scheduleView(
      schedule([
        game("1", "2026-10-01T23:00:00Z", "postponed", "home"),
        game("2", "2026-10-06T23:00:00Z", "live", "home", [1, 0]),
        game("3", "2026-10-09T23:00:00Z", "scheduled", "away"),
      ]),
    );
    expect(upcoming.map((row) => [row.game.id, row.game.status])).toEqual([
      ["1", "postponed"],
      ["2", "live"],
      ["3", "scheduled"],
    ]);
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
    expect(scheduleView(schedule([]))).toEqual({ upcoming: [], results: [], wins: 0, losses: 0 });
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
  const next = game("8", "2026-10-06T23:00:00Z", "scheduled", "home");

  it("is the game ESPN lists as next, while it is still to be played", () => {
    expect(nextGame(next, [])?.id).toBe("8");
    expect(nextGame(next, [game("8", "2026-10-06T23:00:00Z", "scheduled", "home")])?.id).toBe("8");
  });

  it("is none when the team has no next game", () => {
    expect(nextGame(null, [])).toBeNull();
  });

  it("is none once that game has started, which the cached team page learns late", () => {
    expect(nextGame(next, [game("8", "2026-10-06T23:00:00Z", "live", "home")])).toBeNull();
    expect(nextGame(next, [game("8", "2026-10-06T23:00:00Z", "final", "home", [2, 1])])).toBeNull();
    expect(nextGame({ ...next, status: "live" }, [])).toBeNull();
  });
});

describe("a game's page", () => {
  it("is addressed by ESPN's event id", () => {
    expect(gameHref({ id: "401892449" })).toBe("/nhl/games/401892449");
  });
});
