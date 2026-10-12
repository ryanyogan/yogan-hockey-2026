import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cachedGamePregame,
  cachedPlayer,
  cachedPlayerCareer,
  cachedPlayerGameLog,
  cachedPlayerSearch,
  cachedStandings,
  cachedTeam,
  cachedTeamSchedule,
  cachedTeams,
  forgetGame,
  forgetPlayers,
  forgetStandings,
  forgetTeamList,
  forgetTeams,
} from "./espn";

const TORONTO = "21";
const MATTHEWS = "4024123";
const STOLARZ = "3067313";
const RECORDED_GAME = "401803652";
const MINUTE = 60 * 1000;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  // Fixture mode fills the cache; ESPN, stood in for by this mock, is asked only on a miss.
  vi.stubEnv("ESPN_FIXTURES", "1");
  fetchMock.mockResolvedValue(new Response("", { status: 503 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  fetchMock.mockReset();
});

/** From here a read that misses the cache goes to ESPN, which is down. */
function leaveFixtureMode() {
  vi.stubEnv("ESPN_FIXTURES", "");
}

test("standings are served from the cache until they are forgotten", async () => {
  const first = await cachedStandings();
  expect(first.rows).toHaveLength(32);

  leaveFixtureMode();
  expect(await cachedStandings()).toEqual(first);
  expect(fetchMock).not.toHaveBeenCalled();

  await forgetStandings();
  await expect(cachedStandings()).rejects.toMatchObject({ endpoint: "standings", status: 503 });
});

test("the team list is served from the cache until it is forgotten", async () => {
  const first = await cachedTeams();
  expect(first).toHaveLength(32);

  leaveFixtureMode();
  expect(await cachedTeams()).toEqual(first);
  expect(fetchMock).not.toHaveBeenCalled();

  await forgetTeamList();
  await expect(cachedTeams()).rejects.toMatchObject({ endpoint: "teams" });
});

test("forgetting a team makes the next read of its page and of its schedule a fresh one", async () => {
  const team = await cachedTeam(TORONTO);
  const schedule = await cachedTeamSchedule(TORONTO);
  expect(team.team.abbreviation).toBe("TOR");
  expect(schedule.games).toHaveLength(84);

  leaveFixtureMode();
  expect(await cachedTeam(TORONTO)).toEqual(team);
  expect(await cachedTeamSchedule(TORONTO)).toEqual(schedule);
  expect(fetchMock).not.toHaveBeenCalled();

  await forgetTeams([TORONTO]);
  await expect(cachedTeam(TORONTO)).rejects.toMatchObject({ endpoint: "teams/21" });
  await expect(cachedTeamSchedule(TORONTO)).rejects.toMatchObject({
    endpoint: "teams/21/schedule",
  });
});

test("one team's cache is not another's", async () => {
  await cachedTeam(TORONTO);
  await forgetTeams(["10"]);

  leaveFixtureMode();
  expect((await cachedTeam(TORONTO)).team.abbreviation).toBe("TOR");
  await expect(cachedTeam("10")).rejects.toMatchObject({ endpoint: "teams/10" });
});

test("forgetting a player makes the next read of his page, career and game log a fresh one", async () => {
  const player = await cachedPlayer(MATTHEWS);
  const career = await cachedPlayerCareer(MATTHEWS);
  const gameLog = await cachedPlayerGameLog(MATTHEWS);
  expect(player.name).toBe("Auston Matthews");
  expect(career.seasons).toHaveLength(11);
  expect(gameLog.games).toHaveLength(3);

  leaveFixtureMode();
  expect(await cachedPlayer(MATTHEWS)).toEqual(player);
  expect(await cachedPlayerCareer(MATTHEWS)).toEqual(career);
  expect(await cachedPlayerGameLog(MATTHEWS)).toEqual(gameLog);
  expect(fetchMock).not.toHaveBeenCalled();

  await forgetPlayers([MATTHEWS]);
  await expect(cachedPlayer(MATTHEWS)).rejects.toMatchObject({ endpoint: "athletes/4024123" });
  await expect(cachedPlayerCareer(MATTHEWS)).rejects.toMatchObject({
    endpoint: "athletes/4024123/stats",
  });
  await expect(cachedPlayerGameLog(MATTHEWS)).rejects.toMatchObject({
    endpoint: "athletes/4024123/gamelog",
  });
});

test("one player's cache is not another's", async () => {
  await cachedPlayer(STOLARZ);
  await forgetPlayers([MATTHEWS]);

  leaveFixtureMode();
  expect((await cachedPlayer(STOLARZ)).name).toBe("Anthony Stolarz");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("a game's pregame facts are served from the cache until the game is forgotten", async () => {
  const first = await cachedGamePregame(RECORDED_GAME);

  leaveFixtureMode();
  expect(await cachedGamePregame(RECORDED_GAME)).toEqual(first);
  expect(fetchMock).not.toHaveBeenCalled();

  await forgetGame(RECORDED_GAME);
  await expect(cachedGamePregame(RECORDED_GAME)).rejects.toMatchObject({
    endpoint: "summary?event=401803652",
  });
});

test("a player search is cached by what was searched for, whatever its case or spacing", async () => {
  const first = await cachedPlayerSearch("mar");
  expect(first).toHaveLength(10);

  leaveFixtureMode();
  expect(await cachedPlayerSearch(" Mar ")).toEqual(first);
  expect(fetchMock).not.toHaveBeenCalled();

  await expect(cachedPlayerSearch("marn")).rejects.toMatchObject({ endpoint: "search" });
});

test("a read inside its time limit does not ask ESPN again", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await forgetStandings();
  const first = await cachedStandings();

  // Four minutes on, the standings are inside their five.
  vi.setSystemTime(Date.now() + 4 * MINUTE);
  leaveFixtureMode();
  expect(await cachedStandings()).toEqual(first);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("a read past its time limit is answered from the cache at once and refreshed behind", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await forgetTeamList();
  const first = await cachedTeams();
  expect(first.length).toBeGreaterThan(30);

  // A day and a minute on, the team list is past its time limit, and ESPN is down.
  vi.setSystemTime(Date.now() + (24 * 60 + 1) * MINUTE);
  leaveFixtureMode();

  // The visitor does not wait on ESPN and is not shown its failure: the stale list answers.
  expect(await cachedTeams()).toEqual(first);
  // ESPN is asked all the same, behind the answer, for whoever reads next.
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

  // ESPN answers again with one team: the read behind the next stale answer keeps it, and the
  // read after that is given it.
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => Response.json(await oneTeam()));
  expect(await cachedTeams()).toEqual(first);
  await vi.waitFor(async () => expect(await cachedTeams()).toHaveLength(1));
});

/** ESPN's team list as recorded, cut down to its first team. */
async function oneTeam(): Promise<unknown> {
  const { default: recorded } = await import("../../../packages/espn/fixtures/teams.json");
  const body = structuredClone(recorded);
  const league = body.sports[0]?.leagues[0];
  if (!league) throw new Error("The recorded team list has no league");
  league.teams = league.teams.slice(0, 1);
  return body;
}
