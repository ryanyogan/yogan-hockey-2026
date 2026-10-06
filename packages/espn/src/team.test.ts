import { describe, expect, test } from "vitest";
import { endpoints } from "./endpoints.ts";
import { EspnParseError } from "./errors.ts";
import { loadFixture } from "./fixtures.ts";
import { translateTeam, translateTeamSchedule, translateTeams } from "./team.ts";

const TORONTO = "21";

describe("the team list", () => {
  test("is all thirty-two teams, each with both logos", async () => {
    const teams = translateTeams(await loadFixture(endpoints.teams()));

    expect(teams).toHaveLength(32);
    expect(teams.find((team) => team.id === TORONTO)).toEqual({
      id: "21",
      abbreviation: "TOR",
      name: "Toronto Maple Leafs",
      shortName: "Maple Leafs",
      location: "Toronto",
      color: "003e7e",
      logo: "https://a.espncdn.com/i/teamlogos/nhl/500/tor.png",
      logoDark: "https://a.espncdn.com/i/teamlogos/nhl/500-dark/tor.png",
    });
  });

  test("matches the snapshot", async () => {
    expect(translateTeams(await loadFixture(endpoints.teams()))).toMatchSnapshot();
  });

  test("a response that is not the team list is a parse error naming the endpoint", () => {
    expect(() => translateTeams({ sports: [] })).toThrow(/ESPN teams did not parse/);
  });
});

describe("team detail", () => {
  const recorded = () => loadFixture(endpoints.team(TORONTO));

  test("has the header's record and standing", async () => {
    const detail = translateTeam(await recorded(), TORONTO);

    expect(detail.team).toMatchObject({ id: "21", abbreviation: "TOR", color: "003e7e" });
    expect(detail.record).toEqual({ overall: "1-2-0", home: "1-2-0", road: "0-0-0" });
    expect(detail.standingSummary).toBe("6th in Atlantic Division");
  });

  test("has the team's stats", async () => {
    const detail = translateTeam(await recorded(), TORONTO);

    expect(detail.stats).toEqual({
      gamesPlayed: 3,
      wins: 1,
      losses: 2,
      otLosses: 0,
      points: 2,
      goalsFor: 6,
      goalsAgainst: 7,
      goalDifferential: -1,
      powerPlayPct: 18.182,
      penaltyKillPct: 100,
    });
  });

  test("has the roster", async () => {
    const detail = translateTeam(await recorded(), TORONTO);

    expect(detail.roster).toHaveLength(24);
    expect(detail.roster[0]).toEqual({
      id: "4781550",
      name: "Nick Blankenburg",
      jersey: "3",
      position: "D",
      headshot: "https://a.espncdn.com/i/headshots/nhl/players/full/4781550.png",
    });
  });

  test("has the next game, in the shape of any other game", async () => {
    const detail = translateTeam(await recorded(), TORONTO);

    expect(detail.nextGame).toMatchObject({
      id: "401892449",
      startTime: "2026-10-06T23:00:00.000Z",
      status: "scheduled",
      home: { abbreviation: "TOR", score: 0 },
      away: { abbreviation: "NSH", score: 0 },
      venue: "Scotiabank Arena",
      broadcasts: ["ESPN+", "Scripps Sports"],
    });
  });

  test("matches the snapshot", async () => {
    expect(translateTeam(await recorded(), TORONTO)).toMatchSnapshot();
  });

  test("a response that is not a team is a parse error naming the endpoint", () => {
    const parse = () => translateTeam({ id: 21 }, TORONTO);

    expect(parse).toThrow(EspnParseError);
    expect(parse).toThrow(/ESPN teams\/21 did not parse/);
  });
});

describe("a team's schedule", () => {
  const recorded = () => loadFixture(endpoints.teamSchedule(TORONTO));

  test("is the season's games in date order, played and unplayed", async () => {
    const schedule = translateTeamSchedule(await recorded(), TORONTO);

    expect(schedule.teamId).toBe("21");
    expect(schedule.season).toBe("2026-27");
    expect(schedule.games).toHaveLength(84);
    expect(schedule.games.filter((game) => game.status === "final")).toHaveLength(3);
    expect(schedule.games.filter((game) => game.status === "scheduled")).toHaveLength(81);
    expect(schedule.games.map((game) => game.startTime)).toEqual(
      schedule.games.map((game) => game.startTime).toSorted(),
    );
  });

  test("a played game has its score, winner and each team's record after it", async () => {
    const schedule = translateTeamSchedule(await recorded(), TORONTO);

    expect(schedule.games[0]).toMatchObject({
      id: "401891827",
      startTime: "2026-09-29T23:00:00.000Z",
      status: "final",
      detail: "Final",
      home: { abbreviation: "TOR", score: 2, winner: false, record: "0-1-0" },
      away: { abbreviation: "MTL", score: 3, winner: true, record: "1-0-0" },
    });
  });

  test("matches the snapshot", async () => {
    expect(translateTeamSchedule(await recorded(), TORONTO)).toMatchSnapshot();
  });

  test("a response that is not a schedule is a parse error naming the endpoint", () => {
    const parse = () => translateTeamSchedule({ events: [{}] }, TORONTO);

    expect(parse).toThrow(EspnParseError);
    expect(parse).toThrow(/ESPN teams\/21\/schedule did not parse/);
  });
});
