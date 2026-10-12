import { isNotFound } from "@tanstack/react-router";
import { EspnFetchError } from "@yogan-hockey/espn";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readTeam, readTeamRoster, readTeamSchedule, readTeamStats } from "./team-read";

// Fixture mode: Toronto (team 21) is recorded with its schedule, and no other team is.
beforeEach(() => {
  vi.stubEnv("ESPN_FIXTURES", "1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const READS = [readTeam, readTeamSchedule, readTeamRoster, readTeamStats];

describe("what a team's header is read with", () => {
  it("is the team, its record, where it plays and its next game", async () => {
    const read = await readTeam("21");
    expect(read.team.name).toBe("Toronto Maple Leafs");
    expect(read.stats).toMatchObject({ wins: 1, losses: 2, otLosses: 0, points: 2 });
    expect(read.standingSummary).toBe("6th in Atlantic Division");
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
      "standingSummary",
      "stats",
      "team",
    ]);
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
