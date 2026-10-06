import { env } from "cloudflare:workers";
import createKvDataCache from "@vinext/cloudflare/cache/kv-data-adapter.runtime";
import { EspnFetchError } from "@yogan-hockey/espn";
import { setDataCacheHandler } from "vinext/shims/cache-handler";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { findTeam } from "./find-team";

const fetchMock = vi.fn<typeof fetch>();

beforeAll(() => {
  // The site's entry registers the KV cache; this entry is the Agents alone, so the test does it.
  setDataCacheHandler(createKvDataCache({ env: { ...env }, options: undefined }));
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

test("a team ESPN knows is found", async () => {
  vi.stubEnv("ESPN_FIXTURES", "1");
  const toronto = await findTeam("21");
  expect(toronto?.team.name).toBe("Toronto Maple Leafs");
});

test("a team ESPN does not know is no team, which ESPN says with a 400", async () => {
  fetchMock.mockResolvedValue(new Response("{}", { status: 400 }));
  expect(await findTeam("987651")).toBeNull();
  expect(fetchMock).toHaveBeenCalledOnce();
});

test("an id that could not be a team's is no team, and ESPN is not asked", async () => {
  expect(await findTeam("leafs")).toBeNull();
  expect(await findTeam("21;drop")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("ESPN being down is an error, not a missing team", async () => {
  fetchMock.mockResolvedValue(new Response("", { status: 503 }));
  await expect(findTeam("987652")).rejects.toBeInstanceOf(EspnFetchError);
});
