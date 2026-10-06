import { env } from "cloudflare:workers";
import createKvDataCache from "@vinext/cloudflare/cache/kv-data-adapter.runtime";
import { setDataCacheHandler } from "vinext/shims/cache-handler";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import {
  cachedStandings,
  cachedTeam,
  cachedTeamSchedule,
  cachedTeams,
  STANDINGS_TAG,
  TEAMS_TAG,
  teamTag,
} from "./espn";
import { invalidateTag } from "./invalidate-tag";

const TORONTO = "21";
const fetchMock = vi.fn<typeof fetch>();

beforeAll(() => {
  // The site's entry registers the KV cache; this entry is the Agents alone, so the test does it.
  setDataCacheHandler(createKvDataCache({ env: { ...env }, options: undefined }));
});

beforeEach(() => {
  // Fixture mode fills the cache; ESPN, stood in for by this mock, is asked only on a miss.
  vi.stubEnv("ESPN_FIXTURES", "1");
  fetchMock.mockResolvedValue(new Response("", { status: 503 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

/** From here a read that misses the cache goes to ESPN, which is down. */
function leaveFixtureMode() {
  vi.stubEnv("ESPN_FIXTURES", "");
}

test("the tags are the ones the spec's table names", () => {
  expect(STANDINGS_TAG).toBe("standings");
  expect(TEAMS_TAG).toBe("teams");
  expect(teamTag(TORONTO)).toBe("team:21");
});

test("standings are served from the cache until their tag is invalidated", async () => {
  const first = await cachedStandings();
  expect(first.rows).toHaveLength(32);

  leaveFixtureMode();
  expect(await cachedStandings()).toEqual(first);
  expect(fetchMock).not.toHaveBeenCalled();

  await invalidateTag(STANDINGS_TAG);
  await expect(cachedStandings()).rejects.toMatchObject({ endpoint: "standings", status: 503 });
});

test("the team list is served from the cache until its tag is invalidated", async () => {
  const first = await cachedTeams();
  expect(first).toHaveLength(32);

  leaveFixtureMode();
  expect(await cachedTeams()).toEqual(first);
  expect(fetchMock).not.toHaveBeenCalled();

  await invalidateTag(TEAMS_TAG);
  await expect(cachedTeams()).rejects.toMatchObject({ endpoint: "teams" });
});

test("a team's page and its schedule share the team's tag", async () => {
  const team = await cachedTeam(TORONTO);
  const schedule = await cachedTeamSchedule(TORONTO);
  expect(team.team.abbreviation).toBe("TOR");
  expect(schedule.games).toHaveLength(84);

  leaveFixtureMode();
  expect(await cachedTeam(TORONTO)).toEqual(team);
  expect(await cachedTeamSchedule(TORONTO)).toEqual(schedule);
  expect(fetchMock).not.toHaveBeenCalled();

  await invalidateTag(teamTag(TORONTO));
  await expect(cachedTeam(TORONTO)).rejects.toMatchObject({ endpoint: "teams/21" });
  await expect(cachedTeamSchedule(TORONTO)).rejects.toMatchObject({
    endpoint: "teams/21/schedule",
  });
});

test("one team's cache is not another's", async () => {
  await cachedTeam(TORONTO);

  leaveFixtureMode();
  await expect(cachedTeam("10")).rejects.toMatchObject({ endpoint: "teams/10" });
});
