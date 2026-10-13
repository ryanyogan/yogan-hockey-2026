import { env } from "cloudflare:workers";
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import matthewsRecorded from "../../../packages/espn/fixtures/athlete-4024123.json";
import { findPlayers, loadPlayer } from "./players";

const MATTHEWS = "4024123";
const fetchMock = vi.fn<typeof fetch>();

beforeAll(() => {});

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

/** From here ESPN is asked, and answers each of a player's three reads as told. */
function espnAnswersPlayer(answers: {
  profile: () => Response | Promise<Response>;
  career: () => Response | Promise<Response>;
  gameLog: () => Response | Promise<Response>;
}) {
  vi.stubEnv("ESPN_FIXTURES", "");
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/stats")) return answers.career();
    if (url.endsWith("/gamelog")) return answers.gameLog();
    return answers.profile();
  });
}

const status = (code: number) => () => new Response("{}", { status: code });
const noAnswer = () => Promise.reject(new TypeError("fetch failed"));

test("a player ESPN does not know is no player when his stats answer 500, as ESPN's sometimes do", async () => {
  espnAnswersPlayer({ profile: status(404), career: status(500), gameLog: status(404) });

  expect(await loadPlayer("999999901")).toBeNull();
});

test("a player ESPN does not know is no player whichever of the other reads fails, and however", async () => {
  espnAnswersPlayer({ profile: status(404), career: status(404), gameLog: status(503) });
  expect(await loadPlayer("999999902")).toBeNull();

  espnAnswersPlayer({ profile: status(400), career: noAnswer, gameLog: noAnswer });
  expect(await loadPlayer("999999903")).toBeNull();
});

test("the profile says whether a player exists even when it is the last read to answer", async () => {
  let answerProfile: (response: Response) => void = () => {};
  const profile = new Promise<Response>((resolve) => {
    answerProfile = resolve;
  });
  espnAnswersPlayer({ profile: () => profile, career: status(500), gameLog: status(500) });

  const player = loadPlayer("999999904");
  // The other two have failed by now. Nothing is answered until the profile has been heard.
  const early = await Promise.race([
    player.then(
      () => "answered",
      () => "answered",
    ),
    new Promise((resolve) => setTimeout(resolve, 50, "waiting")),
  ]);
  expect(early).toBe("waiting");

  answerProfile(new Response("{}", { status: 404 }));
  expect(await player).toBeNull();
});

test("a player ESPN knows whose stats cannot be read is an error, not a missing player", async () => {
  const matthews = JSON.stringify(matthewsRecorded);
  espnAnswersPlayer({
    profile: () => new Response(matthews),
    career: status(500),
    gameLog: status(404),
  });

  await expect(loadPlayer("999999905")).rejects.toMatchObject({
    endpoint: "athletes/999999905/stats",
    status: 500,
  });
});

test("ESPN failing to answer for the profile is an error whatever the other reads say", async () => {
  espnAnswersPlayer({ profile: status(500), career: status(404), gameLog: status(404) });
  await expect(loadPlayer("999999906")).rejects.toMatchObject({
    endpoint: "athletes/999999906",
    status: 500,
  });

  espnAnswersPlayer({ profile: noAnswer, career: status(404), gameLog: status(404) });
  await expect(loadPlayer("999999907")).rejects.toMatchObject({ status: null });
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
