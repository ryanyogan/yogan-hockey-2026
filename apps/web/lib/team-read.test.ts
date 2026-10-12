import { isNotFound } from "@tanstack/react-router";
import { EspnFetchError } from "@yogan-hockey/espn";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import standingsRecorded from "../../../packages/espn/fixtures/standings.json";
import teamBefore from "../../../packages/espn/fixtures/team-21.json";
import teamSince20261012 from "../../../packages/espn/fixtures/team-21-20261012.json";
import { forgetStandings, forgetTeams } from "./espn";
import { teamStandingLine } from "./team-page";
import { readTeam, readTeamRoster, readTeamSchedule, readTeamStats } from "./team-read";

// Fixture mode: Toronto (team 21) is recorded with its schedule, and no other team is.
beforeEach(() => {
  vi.stubEnv("ESPN_FIXTURES", "1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * ESPN answering with recorded responses, through the real fetch, cache and parsers: the
 * standings as recorded, and for Toronto the team response given. Any other team is a 400, which
 * is how ESPN says it has no such team.
 */
async function espnAnswers(team: unknown, standings: unknown = standingsRecorded) {
  vi.stubEnv("ESPN_FIXTURES", "");
  await Promise.all([forgetStandings(), forgetTeams(["21"])]);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes("/standings")) return Response.json(standings);
      if (/\/teams\/21\?/.test(url)) return Response.json(team);
      return new Response("{}", { status: 400 });
    }),
  );
}

const READS = [readTeam, readTeamSchedule, readTeamRoster, readTeamStats];

describe("what a team's header is read with", () => {
  it("is the team, its record, where it plays and its next game", async () => {
    const read = await readTeam("21");
    expect(read.team.name).toBe("Toronto Maple Leafs");
    expect(read.stats).toMatchObject({ wins: 1, losses: 2, otLosses: 0, points: 2 });
    expect(read.standing?.conference.name).toBe("Eastern Conference");
    expect(read.standing?.division.name).toBe("Atlantic Division");
    expect(read.nextGame?.id).toBe("401892449");
    // No pick has been made in the test's database.
    expect(read.picks).toEqual({});
  });

  it("is nothing a tab draws: the roster and the split records are the tabs' own reads", async () => {
    expect(Object.keys(await readTeam("21")).sort()).toEqual([
      "nextGame",
      "picks",
      "standing",
      "stats",
      "team",
    ]);
  });
});

describe("where the header says a team stands", () => {
  // The other tests read Toronto in fixture mode: nothing a stubbed ESPN answered is left cached.
  afterEach(() => Promise.all([forgetStandings(), forgetTeams(["21"])]));

  // The standings fixture has the Atlantic as Ottawa, Tampa Bay, Florida, Boston, Montreal,
  // Buffalo, Toronto, Detroit: Toronto and Buffalo are level on 2 points and Buffalo has played
  // one game fewer, which is the NHL's second tiebreaker and the order `/nhl` draws.
  const TORONTO_STANDS = "7th in Atlantic Division";

  it("is worked out from the standings, whichever shape of team response ESPN sends", async () => {
    for (const team of [teamBefore, teamSince20261012]) {
      await espnAnswers(team);
      const read = await readTeam("21");
      expect(read.standing?.divisionRank).toBe(7);
      expect(teamStandingLine(read.standing)).toBe(TORONTO_STANDS);
    }
  });

  it("is not ESPN's own summary, which has been the same for every team since 2026-10-12", async () => {
    expect(teamSince20261012.team.standingSummary).toBe("1st in Eastern Conference");
    await espnAnswers(teamSince20261012);
    const read = await readTeam("21");
    expect(read).not.toHaveProperty("standingSummary");
    expect(JSON.stringify(read)).not.toContain("1st in Eastern Conference");
  });

  it("differs from the summary ESPN sent before by one place, where two teams are level", async () => {
    // Recorded in the same run as the standings (Toronto is 1-2-0 in both), yet ESPN's summary
    // said 6th while its own standings listed Buffalo above Toronto. The site says what its
    // standings table shows.
    expect(teamBefore.team.standingSummary).toBe("6th in Atlantic Division");
    await espnAnswers(teamBefore);
    expect(teamStandingLine((await readTeam("21")).standing)).toBe(TORONTO_STANDS);
  });

  it("is the same in fixture mode, where Toronto is the old response", async () => {
    expect(teamStandingLine((await readTeam("21")).standing)).toBe(TORONTO_STANDS);
  });

  it("is a dash for a team the standings do not list", async () => {
    // ESPN's standings are conferences of divisions of entries: the same, less Toronto's.
    type Group = { standings?: { entries: { team: { id: string } }[] }; children?: Group[] };
    const drop = (group: Group) => {
      if (group.standings) {
        group.standings.entries = group.standings.entries.filter(({ team }) => team.id !== "21");
      }
      group.children?.forEach(drop);
    };
    const without: Group = structuredClone(standingsRecorded);
    drop(without);
    await espnAnswers(teamSince20261012, without);
    const read = await readTeam("21");
    expect(read.team.name).toBe("Toronto Maple Leafs");
    expect(read.standing).toBeNull();
    expect(teamStandingLine(read.standing)).toBe("-");
  });

  it("is a dash when the standings could not be read", async () => {
    await espnAnswers(teamSince20261012, { not: "standings" });
    const read = await readTeam("21");
    expect(read.standing).toBeNull();
    expect(teamStandingLine(read.standing)).toBe("-");
  });
});

describe("what a team's tabs are read with", () => {
  it("the schedule is the games to come and the results, counted", async () => {
    const view = await readTeamSchedule("21");
    expect(view.upcoming).toHaveLength(81);
    expect(view.results).toHaveLength(3);
    expect(view).toMatchObject({ wins: 1, losses: 2, postponed: [] });
  });

  it("the roster is in jersey order", async () => {
    const roster = await readTeamRoster("21");
    expect(roster).toHaveLength(24);
    expect(roster[0]).toMatchObject({ jersey: "3", name: "Nick Blankenburg" });
  });

  it("the stats are the season's figures and the record at home and on the road", async () => {
    const read = await readTeamStats("21");
    expect(read.stats).toMatchObject({ gamesPlayed: 3, goalsFor: 6, goalsAgainst: 7 });
    expect(read.record).toMatchObject({ home: "1-2-0", road: "0-0-0" });
  });
});

describe("a team that cannot be read", () => {
  it("is not found when the id is no team's, whichever read is asked", async () => {
    for (const read of READS) {
      expect(isNotFound(await read("leafs").catch((error: unknown) => error))).toBe(true);
    }
  });

  it("is ESPN's failure when ESPN cannot supply it, whichever read is asked", async () => {
    for (const read of READS) {
      await expect(read("1")).rejects.toBeInstanceOf(EspnFetchError);
    }
  });
});
