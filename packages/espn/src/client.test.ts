import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getScoreboard, getStandings, getTeam, getTeamSchedule, getTeams } from "./client.ts";
import { endpoints } from "./endpoints.ts";
import { EspnFetchError, EspnParseError } from "./errors.ts";
import { loadFixture } from "./fixtures.ts";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("in fixture mode", () => {
  beforeEach(() => {
    vi.stubEnv("ESPN_FIXTURES", "1");
  });

  test("every read is answered from the recorded responses, without the network", async () => {
    const [tonight, saturday, standings, teams, team, schedule] = await Promise.all([
      getScoreboard(),
      getScoreboard("2026-10-03"),
      getStandings(),
      getTeams(),
      getTeam("21"),
      getTeamSchedule("21"),
    ]);

    expect(tonight.date).toBe("2026-10-06");
    expect(saturday.games).toHaveLength(13);
    expect(standings.rows).toHaveLength(32);
    expect(teams).toHaveLength(32);
    expect(team.team.abbreviation).toBe("TOR");
    expect(schedule.games).toHaveLength(84);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a read with no recorded response fails, naming the endpoint and the missing file", async () => {
    const read = getTeam("1");

    await expect(read).rejects.toThrow(EspnFetchError);
    await expect(read).rejects.toMatchObject({ endpoint: "teams/1", status: null });
    await expect(read).rejects.toThrow(/fixtures\/team-1\.json/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("against ESPN", () => {
  test("a read fetches its endpoint and translates the answer", async () => {
    const recorded = await loadFixture(endpoints.standings());
    fetchMock.mockResolvedValue(Response.json(recorded));

    const standings = await getStandings();

    expect(standings.rows).toHaveLength(32);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings?level=3",
    );
  });

  test("the scoreboard for a date asks ESPN for that date", async () => {
    fetchMock.mockResolvedValue(Response.json({ events: [] }));

    const scoreboard = await getScoreboard("2026-07-15");

    expect(scoreboard).toEqual({ date: "2026-07-15", games: [] });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=20260715",
    );
  });

  test("an answer in a shape ESPN did not use before is a parse error naming the endpoint", async () => {
    fetchMock.mockResolvedValue(Response.json({ sports: "hockey" }));

    const read = getTeams();

    await expect(read).rejects.toThrow(EspnParseError);
    await expect(read).rejects.toMatchObject({ name: "EspnParseError", endpoint: "teams" });
  });

  test("an answer that is not JSON is a parse error naming the endpoint", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Service unavailable</html>"));

    const read = getTeamSchedule("21");

    await expect(read).rejects.toThrow(EspnParseError);
    await expect(read).rejects.toMatchObject({ endpoint: "teams/21/schedule" });
  });

  test("a team ESPN does not have is a fetch error that says not found", async () => {
    // ESPN answers an unknown team id with a 400.
    fetchMock.mockResolvedValue(new Response("{}", { status: 400 }));

    const read = getTeam("9999");

    await expect(read).rejects.toThrow(EspnFetchError);
    await expect(read).rejects.toMatchObject({
      endpoint: "teams/9999",
      status: 400,
      notFound: true,
    });
  });

  test("a server error is a fetch error that does not say not found", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));

    await expect(getStandings()).rejects.toMatchObject({
      name: "EspnFetchError",
      endpoint: "standings",
      status: 503,
      notFound: false,
    });
  });

  test("no answer at all is a fetch error naming the endpoint", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getScoreboard()).rejects.toMatchObject({
      name: "EspnFetchError",
      endpoint: "scoreboard",
      status: null,
    });
  });
});

describe("a request that could not be for anything", () => {
  test("is refused before any read", async () => {
    await expect(getScoreboard("yesterday")).rejects.toThrow(RangeError);
    await expect(getTeam("../scoreboard")).rejects.toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
