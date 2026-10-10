import { env } from "cloudflare:workers";
import createKvDataCache from "@vinext/cloudflare/cache/kv-data-adapter.runtime";
import { setDataCacheHandler } from "vinext/shims/cache-handler";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { findPlayers, loadPlayer } from "./players";

const MATTHEWS = "4024123";
const fetchMock = vi.fn<typeof fetch>();

beforeAll(() => {
  // The site's entry registers the KV cache; this entry is the Agents alone, so the test does it.
  setDataCacheHandler(createKvDataCache({ env: { ...env }, options: undefined }));
});

beforeEach(() => {
  vi.stubEnv("ESPN_FIXTURES", "1");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

/** From here ESPN is asked, and answers every request with this status. */
function espnAnswers(status: number) {
  vi.stubEnv("ESPN_FIXTURES", "");
  fetchMock.mockImplementation(async () => new Response("{}", { status }));
}

test("a search finds players, each with a team and a position", async () => {
  const search = await findPlayers("mar");

  expect(search.status).toBe("found");
  expect(search.query).toBe("mar");
  expect(search.players).toHaveLength(10);
  expect(search.players[0]).toMatchObject({
    id: "3852",
    name: "Brad Marchand",
    position: "LW",
    team: { abbreviation: "FLA" },
  });
});

test("a search starts at two characters", async () => {
  espnAnswers(200);

  expect(await findPlayers("m")).toEqual({ status: "idle", query: "m", players: [] });
  expect(await findPlayers("  m  ")).toEqual({ status: "idle", query: "m", players: [] });
  expect(await findPlayers("")).toEqual({ status: "idle", query: "", players: [] });
  expect(fetchMock).not.toHaveBeenCalled();
});

test("a search ESPN cannot answer is unavailable, not an error", async () => {
  espnAnswers(503);

  expect(await findPlayers("zzz-down")).toEqual({
    status: "unavailable",
    query: "zzz-down",
    players: [],
  });
});

test("a query is trimmed and cut to a length ESPN would take", async () => {
  espnAnswers(503);

  const search = await findPlayers(`  ${"a".repeat(200)}  `);

  expect(search.query).toBe("a".repeat(50));
});

test("a player loads with his profile, career and game log", async () => {
  const player = await loadPlayer(MATTHEWS);

  expect(player?.profile.name).toBe("Auston Matthews");
  expect(player?.career.seasons).toHaveLength(11);
  expect(player?.gameLog.games).toHaveLength(3);
});

test("a player ESPN does not know is no player", async () => {
  espnAnswers(404);

  expect(await loadPlayer("999999999")).toBeNull();
});

test("an id that is not ESPN's kind of id is no player, and ESPN is not asked", async () => {
  espnAnswers(200);

  expect(await loadPlayer("../teams/21")).toBeNull();
  expect(await loadPlayer("")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("ESPN being down is an error, not a missing player", async () => {
  espnAnswers(503);

  await expect(loadPlayer("888888888")).rejects.toMatchObject({ status: 503 });
});

test("a search ESPN answers in a shape the site cannot read is unavailable too", async () => {
  vi.stubEnv("ESPN_FIXTURES", "");
  fetchMock.mockImplementation(async () => new Response("not json", { status: 200 }));

  expect((await findPlayers("zzz-garbled")).status).toBe("unavailable");
});

test("retired fictional player ids do not resolve or ask ESPN", async () => {
  espnAnswers(503);
  expect(await loadPlayer("rylan-yogan")).toBeNull();
  expect(await loadPlayer("easter-egg-rylan-yogan")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("search does not invent a player when ESPN is unavailable", async () => {
  espnAnswers(503);
  expect(await findPlayers("yogan")).toEqual({
    status: "unavailable",
    query: "yogan",
    players: [],
  });
});
