import { describe, expect, test } from "vitest";
import { endpoints } from "./endpoints.ts";
import { EspnFetchError, EspnParseError } from "./errors.ts";
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

/**
 * ESPN changed the team response on 2026-10-12: a headshot is the URL itself, the record is one
 * "total" item whose summary leaves the overtime losses out, and `pointDifferential`, the two
 * special-teams percentages and the home and road items are gone. `team-21.json` is the shape
 * before and `team-21-20261012.json` the shape since, and the site reads both.
 */
describe("team detail in the shape ESPN has sent since 2026-10-12", () => {
  const recorded = () => loadFixture({ ...endpoints.team(TORONTO), fixture: "team-21-20261012" });

  test("has the roster, a headshot being the URL itself or absent", async () => {
    const { roster } = translateTeam(await recorded(), TORONTO);

    expect(roster).toHaveLength(25);
    expect(roster[0]).toEqual({
      id: "4781550",
      name: "Nick Blankenburg",
      jersey: "3",
      position: "D",
      headshot: "https://a.espncdn.com/i/headshots/nhl/players/full/4781550.png",
    });
    expect(
      roster.filter((player) => player.headshot === null).map((player) => player.name),
    ).toEqual(["Luke Haymes", "Matt Hellickson"]);
  });

  test("has the team's stats, the difference being ESPN's `pointsDiff` and the percentages worked out from the counts", async () => {
    const detail = translateTeam(await recorded(), TORONTO);

    expect(detail.stats).toEqual({
      gamesPlayed: 6,
      wins: 3,
      losses: 2,
      otLosses: 1,
      points: 7,
      goalsFor: 20,
      goalsAgainst: 18,
      goalDifferential: 2,
      // 5 goals on 19 power plays, and 1 goal against in 20 times short-handed.
      powerPlayPct: 26.316,
      penaltyKillPct: 95,
    });
  });

  test("has the records with their overtime losses, the home and road ones from the total's counts", async () => {
    const detail = translateTeam(await recorded(), TORONTO);

    // ESPN's own summary is "3-2".
    expect(detail.record).toEqual({ overall: "3-2-1", home: "2-2-0", road: "1-0-1" });
  });

  test("has the next game", async () => {
    const detail = translateTeam(await recorded(), TORONTO);

    expect(detail.nextGame).toMatchObject({
      id: "401892500",
      status: "scheduled",
      home: { abbreviation: "UTA" },
      away: { abbreviation: "TOR" },
    });
  });

  test("matches the snapshot", async () => {
    expect(translateTeam(await recorded(), TORONTO)).toMatchSnapshot();
  });
});

describe("a team record's figures, where ESPN leaves some out", () => {
  /** A team response with only a total record, whose stats are these. */
  const withStats = (stats: Record<string, number>, summary = "1-2") => ({
    team: {
      id: "21",
      abbreviation: "TOR",
      displayName: "Toronto Maple Leafs",
      shortDisplayName: "Maple Leafs",
      location: "Toronto",
      record: {
        items: [
          {
            type: "total",
            summary,
            stats: Object.entries(stats).map(([name, value]) => ({ name, value })),
          },
        ],
      },
    },
  });
  const counts = { gamesPlayed: 3, wins: 1, losses: 2, otLosses: 0, points: 2 };

  test("the goal difference is goals for less goals against when ESPN sends neither of its names for it", () => {
    const detail = translateTeam(withStats({ ...counts, pointsFor: 6, pointsAgainst: 7 }), TORONTO);

    expect(detail.stats?.goalDifferential).toBe(-1);
  });

  test("a percentage ESPN sends is read as sent, whatever the counts say", () => {
    const detail = translateTeam(
      withStats({
        ...counts,
        pointsFor: 6,
        pointsAgainst: 7,
        powerPlayPct: 18.182,
        powerPlayGoals: 1,
        powerPlayOpportunities: 2,
      }),
      TORONTO,
    );

    expect(detail.stats?.powerPlayPct).toBe(18.182);
  });

  test("a percentage is absent without its counts, and before the first power play either way", () => {
    const none = translateTeam(withStats({ ...counts, pointsFor: 6, pointsAgainst: 7 }), TORONTO);
    const unplayed = translateTeam(
      withStats({
        ...counts,
        pointsFor: 6,
        pointsAgainst: 7,
        powerPlayGoals: 0,
        powerPlayOpportunities: 0,
        powerPlayGoalsAgainst: 0,
        timesShortHanded: 0,
      }),
      TORONTO,
    );

    expect(none.stats).toMatchObject({ powerPlayPct: null, penaltyKillPct: null });
    expect(unplayed.stats).toMatchObject({ powerPlayPct: null, penaltyKillPct: null });
  });

  test("the home and road records are absent without their counts, and a three-part summary is kept", () => {
    const detail = translateTeam(
      withStats({ ...counts, pointsFor: 6, pointsAgainst: 7, homeWins: 1, homeLosses: 2 }, "9-9-9"),
      TORONTO,
    );

    expect(detail.record).toEqual({ overall: "9-9-9", home: null, road: null });
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

describe("a team ESPN does not know", () => {
  test("is not found, which ESPN says with a 200 and an empty object", () => {
    // What ESPN answers for teams/999, teams/38 and any other id no team has.
    const read = () => translateTeam({}, "999");

    expect(read).toThrow(EspnFetchError);
    expect(read).toThrow(expect.objectContaining({ endpoint: "teams/999", notFound: true }));
  });

  test("is not found when ESPN sends its placeholder: an inactive team with no name", () => {
    // What ESPN answers for teams/0, cut to the fields that say so.
    const placeholder = {
      team: { id: "0", uid: "s:70~l:90~t:0", isActive: false, franchise: { id: "0" }, links: [] },
    };

    expect(() => translateTeam(placeholder, "0")).toThrow(
      expect.objectContaining({ endpoint: "teams/0", notFound: true }),
    );
  });

  test("a team with a name in a shape the site cannot read is a parse error, not a missing team", () => {
    const changed = { team: { id: "21", isActive: true, displayName: "Toronto Maple Leafs" } };

    expect(() => translateTeam(changed, TORONTO)).toThrow(EspnParseError);
    // Near the placeholder, and each names or numbers a team: one ESPN knows that does not play.
    const whalers = { team: { id: "36", isActive: false, name: "Hartford Whalers" } };
    expect(() => translateTeam(whalers, "36")).toThrow(EspnParseError);
    expect(() => translateTeam({ team: { id: "36", isActive: false } }, "36")).toThrow(
      EspnParseError,
    );
    expect(() =>
      translateTeam({ team: { id: "0", isActive: false, name: "Nobody" } }, "0"),
    ).toThrow(EspnParseError);
    expect(() => translateTeam({ teams: [] }, TORONTO)).toThrow(EspnParseError);
    expect(() => translateTeam(null, TORONTO)).toThrow(EspnParseError);
    expect(() => translateTeam([], TORONTO)).toThrow(EspnParseError);
  });
});
