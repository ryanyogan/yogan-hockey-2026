import { env } from "cloudflare:workers";
import createKvDataCache from "@vinext/cloudflare/cache/kv-data-adapter.runtime";
import { setDataCacheHandler } from "vinext/shims/cache-handler";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { loadFavoritePlayers } from "./favorite-players";

const MATTHEWS = "4024123";
const STOLARZ = "3067313";
const fetchMock = vi.fn<typeof fetch>();

beforeAll(() => {
  // The site's entry registers the KV cache; this entry is the Agents alone, so the test does it.
  setDataCacheHandler(createKvDataCache({ env: { ...env }, options: undefined }));
});

beforeEach(() => {
  vi.stubEnv("ESPN_FIXTURES", "1");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

// A cold Agent-less read of three fixtures per player; see the build notes on cold starts.
const SLOW = 20_000;

test(
  "favorite ids become players with a team and a season line, in the order stored",
  async () => {
    const { players, unavailable } = await loadFavoritePlayers([STOLARZ, MATTHEWS]);

    expect(unavailable).toBe(false);
    expect(players.map((player) => player.name)).toEqual(["Anthony Stolarz", "Auston Matthews"]);
    expect(players[1]).toMatchObject({
      id: MATTHEWS,
      position: "C",
      jersey: "34",
      team: { id: "21", abbreviation: "TOR", name: "Toronto Maple Leafs" },
    });
    // A skater's line is games, goals, assists and points; a goalie's is his own.
    expect(players[1]?.season.map((stat) => stat.label)).toEqual(["GP", "G", "A", "PTS"]);
    expect(players[0]?.season.map((stat) => stat.label)).toEqual(["GP", "W", "GAA", "SV%"]);
    expect(players[1]?.season.every((stat) => /^-?[\d.]+$/.test(stat.value))).toBe(true);
  },
  SLOW,
);

test(
  "an id that is nobody's is skipped without a word",
  async () => {
    const { players, unavailable } = await loadFavoritePlayers(["not-espn", MATTHEWS, "also-not"]);

    expect(players.map((player) => player.id)).toEqual([MATTHEWS]);
    expect(unavailable).toBe(false);
  },
  SLOW,
);

test(
  "a player ESPN no longer has is skipped without a word",
  async () => {
    vi.stubEnv("ESPN_FIXTURES", "");
    fetchMock.mockImplementation(async () => new Response("{}", { status: 404 }));

    expect(await loadFavoritePlayers(["900000001"])).toEqual({ players: [], unavailable: false });
  },
  SLOW,
);

test(
  "a player who cannot be read is left out, and the answer says some are missing",
  async () => {
    vi.stubEnv("ESPN_FIXTURES", "");
    fetchMock.mockImplementation(async () => new Response("{}", { status: 503 }));

    expect(await loadFavoritePlayers(["900000002"])).toEqual({ players: [], unavailable: true });
  },
  SLOW,
);

test("what arrives is read as stored favorites are: not a list is nobody", async () => {
  expect(await loadFavoritePlayers("4024123")).toEqual({ players: [], unavailable: false });
  expect(await loadFavoritePlayers(undefined)).toEqual({ players: [], unavailable: false });
  expect(fetchMock).not.toHaveBeenCalled();
});
