import { applyD1Migrations, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import createKvDataCache from "@vinext/cloudflare/cache/kv-data-adapter.runtime";
import { createKvKeySpace } from "@vinext/cloudflare/cache/kv-key";
import { createDb, getGameWithPlays, replaceGamePlays } from "@yogan-hockey/db";
import type { Game, Play, ScoreboardState } from "@yogan-hockey/schemas";
import { getAgentByName, routeAgentRequest } from "agents";
import { setDataCacheHandler } from "vinext/shims/cache-handler";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import recordedSlate from "../../../packages/espn/fixtures/scoreboard.json";
import recordedFinals from "../../../packages/espn/fixtures/scoreboard-20261003.json";
import recordedSummary from "../../../packages/espn/fixtures/summary-401803652.json";
import recordedTeam from "../../../packages/espn/fixtures/team-21.json";

/** Ahead of the real clock, as in `scoreboard-agent.test.ts`, so no schedule is due by itself. */
const NOW = Date.parse("2031-01-15T23:00:00Z");
const TODAY = "2031-01-15";
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const SLOW = 5 * MINUTE;
const FAST = 30;

type FinalEvent = (typeof recordedFinals)["events"][number];

const db = createDb(env.DB);

/** The path and query of every request made to ESPN, in order. */
let espnRequests: string[];
/** ESPN's current slate. */
let espnSlate: () => Response;
/** ESPN's slate for a date asked for by name, keyed `YYYYMMDD`. A date not here has no games. */
let espnDatedSlates: Map<string, () => Response>;
/** ESPN's answer for a team. */
let espnTeam: (teamId: string) => Response;

const espnDown = () => new Response("Bad gateway", { status: 502 });

/** The first recorded final, Chicago 3 at Buffalo 4, under an id of the test's own. */
function finalEvent(id: string): FinalEvent {
  const [recorded] = recordedFinals.events;
  if (!recorded) throw new Error("The recorded slate has no games");
  const event = structuredClone(recorded);
  event.id = id;
  return event;
}

/** The same game while it was still being played. */
function liveEvent(id: string): FinalEvent {
  const event = finalEvent(id);
  const type = event.competitions[0]?.status.type;
  if (!type) throw new Error("The recorded game has no status");
  Object.assign(type, { state: "in", completed: false });
  return event;
}

/** ESPN's current slate: the one answer that says which day it is for. */
function todaysSlate(date: string, events: unknown[]): () => Response {
  return () => Response.json({ ...recordedFinals, day: { date }, events });
}

/** ESPN's slate for a date asked for by name. */
function datedSlate(events: unknown[]): () => Response {
  return () => Response.json({ ...recordedFinals, events });
}

/** The players ESPN lists for a team in these tests: the recorded roster under ids of the team's own. */
function rosterIds(teamId: string): string[] {
  return recordedTeam.team.athletes.map((_athlete, index) => `${teamId}-${index}`);
}

function teamDetail(teamId: string): Response {
  const body = structuredClone(recordedTeam);
  body.team.id = teamId;
  rosterIds(teamId).forEach((id, index) => {
    const athlete = body.team.athletes[index];
    if (athlete) athlete.id = id;
  });
  return Response.json(body);
}

beforeAll(async () => {
  // The site's entry registers the KV cache; this entry is the Agents alone, so the test does it.
  setDataCacheHandler(createKvDataCache({ env: { ...env }, options: undefined }));
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  espnRequests = [];
  espnSlate = todaysSlate(TODAY, []);
  espnDatedSlates = new Map();
  espnTeam = teamDetail;
  await forgetTags();
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(new Request(input, init).url);
    if (url.hostname !== "site.api.espn.com") throw new Error(`Unexpected fetch in a test: ${url}`);
    const path = url.pathname.replace(/^.*\/nhl\//, "");
    espnRequests.push(`${path}${url.search}`);
    const dates = url.searchParams.get("dates");
    if (path === "scoreboard" && dates) return (espnDatedSlates.get(dates) ?? datedSlate([]))();
    if (path === "scoreboard") return espnSlate();
    if (path === "summary") return Response.json(recordedSummary);
    const team = /^teams\/(\d+)$/.exec(path);
    if (team?.[1]) return espnTeam(team[1]);
    throw new Error(`Unexpected ESPN request in a test: ${url}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * Where the KV cache records that these tags were invalidated, sorted. A tag with a colon in it
 * is stored under a hash, so a test names the tags it expects and compares keys.
 */
function tagKeys(tags: string[]): string[] {
  const { tagKey } = createKvKeySpace(undefined);
  return tags.map(tagKey).sort();
}

/** The key of every cache tag invalidated since the last `forgetTags`, sorted. */
async function invalidatedTags(): Promise<string[]> {
  const { keys } = await env.VINEXT_KV_CACHE.list({ prefix: "__tag:" });
  return keys.map((key) => key.name).sort();
}

async function forgetTags(): Promise<void> {
  const { keys } = await env.VINEXT_KV_CACHE.list({ prefix: "__tag:" });
  for (const key of keys) await env.VINEXT_KV_CACHE.delete(key.name);
}

function play(id: string): Play {
  return {
    id,
    type: "period-start",
    typeText: "Period Start",
    period: 1,
    periodText: "1st",
    clock: "0:00",
    text: "Start of 1st Period",
    teamId: null,
    coordinate: null,
    scoring: false,
    penalty: false,
    homeScore: 0,
    awayScore: 0,
    strength: null,
    wallclock: null,
    participants: [],
  };
}

let instances = 0;

/** A Scoreboard of this test's own, since the tests of one file share storage. */
async function scoreboard() {
  instances += 1;
  const name = `finals-${instances}`;
  const agent = await getAgentByName(exports.ScoreboardAgent, name);

  /** Opens a socket as a browser does and collects every state pushed to it. */
  async function connect() {
    const response = await routeAgentRequest(
      new Request(`http://localhost/agents/scoreboard-agent/${name}`, {
        headers: { Upgrade: "websocket" },
      }),
      env,
    );
    const socket = response?.webSocket;
    if (!socket) throw new Error(`No socket: HTTP ${response?.status}`);
    const states: ScoreboardState[] = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as { state?: ScoreboardState };
      if (message.state) states.push(message.state);
    });
    socket.accept();
    return { states };
  }

  /** Moves the clock on and runs whatever the Agent has scheduled that is due by then. */
  async function later(seconds: number): Promise<void> {
    vi.setSystemTime(Date.now() + seconds * 1000);
    await runDurableObjectAlarm(agent);
  }

  /** A visit with nobody connected: first paint, then the work the poll left for a timer. */
  async function visit(): Promise<ScoreboardState> {
    const state = await agent.getScoreboard();
    await later(0);
    return state;
  }

  /** The callbacks of the timers the Agent has waiting, sorted. */
  async function timers(): Promise<string[]> {
    const schedules = await runInDurableObject(agent, (instance) => instance.listSchedules());
    return schedules.map((schedule) => schedule.callback).sort();
  }

  return { agent, connect, later, visit, timers };
}

describe("a game goes final", () => {
  test("its row is written to D1: teams, date and final score", async () => {
    const { visit } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [finalEvent("900001")]);

    await visit();

    expect(await getGameWithPlays(db, "900001")).toMatchObject({
      game: {
        id: "900001",
        season: 2027,
        seasonType: 2,
        home: { id: "2", abbreviation: "BUF", name: "Buffalo Sabres", score: 4 },
        away: { id: "4", abbreviation: "CHI", name: "Chicago Blackhawks", score: 3 },
      },
      plays: [],
    });
    const row = await db.query.games.findFirst({
      where: (games, { eq }) => eq(games.id, "900001"),
    });
    expect(row?.date).toBe("2026-10-03");
  });

  test("a game still being played is not written", async () => {
    const { visit } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [liveEvent("900002")]);

    await visit();

    expect(await getGameWithPlays(db, "900002")).toBeNull();
    expect(await invalidatedTags()).toEqual([]);
  });

  test("standings, both teams, the players on both rosters and the game are invalidated", async () => {
    const { visit } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [finalEvent("900003")]);

    await visit();

    const players = [...rosterIds("2"), ...rosterIds("4")].map((id) => `player:${id}`);
    expect(players).toHaveLength(48);
    expect(await invalidatedTags()).toEqual(
      tagKeys(["game:900003", "standings", "team:2", "team:4", ...players]),
    );
  });

  test("open pages are told, after the tags are invalidated", async () => {
    const { connect, later } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [liveEvent("900004")]);
    const viewer = await connect();
    await later(0);
    expect(viewer.states.at(-1)?.invalidatedAt).toBeNull();

    espnSlate = todaysSlate(TODAY, [finalEvent("900004")]);
    await later(FAST);
    await later(7);

    const told = viewer.states.find((state) => state.invalidatedAt);
    expect(told?.invalidatedAt).toBe(new Date(NOW + (FAST + 7) * 1000).toISOString());
    expect(told?.games[0]?.status).toBe("final");
    expect(await invalidatedTags()).toEqual(expect.arrayContaining(tagKeys(["standings"])));
  });

  test("a later poll that finds the game still final does none of it again", async () => {
    const { connect, later } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [finalEvent("900005")]);
    await connect();
    await later(0);
    await later(0);
    await forgetTags();
    const requestsBefore = espnRequests.length;

    await later(SLOW);
    await later(0);

    // The second invalidation comes due with this poll; the game and its players are not touched.
    expect(espnRequests.slice(requestsBefore)).toEqual(["scoreboard"]);
    expect(await invalidatedTags()).toEqual(tagKeys(["standings", "team:2", "team:4"]));
  });

  test("5 minutes later standings and both teams are invalidated again, and pages told again", async () => {
    const { agent, visit, later } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [finalEvent("900006")]);
    await visit();
    await forgetTags();

    await later(5 * MINUTE - 1);
    expect(await invalidatedTags()).toEqual([]);
    await later(1);

    expect(await invalidatedTags()).toEqual(tagKeys(["standings", "team:2", "team:4"]));
    const state = await runInDurableObject(agent, (instance) => instance.state);
    expect(state.invalidatedAt).toBe(new Date(NOW + 5 * MINUTE * 1000).toISOString());
  });

  test("24 hours later the game's plays are read into D1 again if they were archived", async () => {
    const { visit, later } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [finalEvent("900007")]);
    await visit();
    // What the Game Agent leaves at the final, before ESPN's corrections.
    await replaceGamePlays(db, "900007", [play("as-it-happened")]);
    await later(5 * MINUTE);

    await later(24 * HOUR - 5 * MINUTE - 1);
    expect((await getGameWithPlays(db, "900007"))?.plays).toHaveLength(1);
    await later(1);

    const plays = (await getGameWithPlays(db, "900007"))?.plays ?? [];
    expect(plays).toHaveLength(recordedSummary.plays.length);
    expect(plays[0]?.id).toBe(recordedSummary.plays[0]?.id);
    expect(espnRequests).toContain("summary?event=900007");
  });

  test("24 hours later a game whose plays were never archived is left alone", async () => {
    const { visit, later, timers } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [finalEvent("900008")]);
    await visit();
    await later(5 * MINUTE);
    expect(await timers()).toEqual(["rereadPlays"]);

    await later(24 * HOUR);

    expect((await getGameWithPlays(db, "900008"))?.plays).toEqual([]);
    expect(espnRequests).not.toContain("summary?event=900008");
    // Both timers fired once and nothing is left running with nobody watching.
    expect(await timers()).toEqual([]);
  });

  test("work that failed is finished on a later poll, without a second pair of timers", async () => {
    const { visit, timers } = await scoreboard();
    // Another game still on keeps the polls 30 seconds apart, so the retry comes while the
    // first try's timers are both still waiting.
    espnSlate = todaysSlate(TODAY, [finalEvent("900009"), liveEvent("900019")]);
    espnTeam = espnDown;
    await visit();
    expect(await getGameWithPlays(db, "900009")).not.toBeNull();
    expect(await invalidatedTags()).not.toContain(tagKeys(["player:2-0"])[0]);
    expect(await timers()).toEqual(["invalidateAgain", "rereadPlays"]);

    espnTeam = teamDetail;
    vi.setSystemTime(Date.now() + FAST * 1000 + 1000);
    await visit();

    expect(await invalidatedTags()).toContain(tagKeys(["player:2-0"])[0]);
    expect(await timers()).toEqual(["invalidateAgain", "rereadPlays"]);
  });

  test("two games that go final in one poll each get their own row and pair of timers", async () => {
    const { visit, timers } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [finalEvent("900020"), finalEvent("900021")]);

    await visit();

    expect(await getGameWithPlays(db, "900020")).not.toBeNull();
    expect(await getGameWithPlays(db, "900021")).not.toBeNull();
    expect(await timers()).toEqual([
      "invalidateAgain",
      "invalidateAgain",
      "rereadPlays",
      "rereadPlays",
    ]);
  });

  test("a final that keeps failing is given up on after three tries", async () => {
    const { visit } = await scoreboard();
    espnSlate = todaysSlate(TODAY, [finalEvent("900010")]);
    espnTeam = espnDown;
    const teamRequests = () => espnRequests.filter((path) => path.startsWith("teams/")).length;

    for (let tries = 0; tries < 5; tries += 1) {
      await visit();
      vi.setSystemTime(Date.now() + SLOW * 1000 + 1000);
    }

    // Both rosters are asked for on each try.
    expect(teamRequests()).toBe(6);
  });
});

describe("a game seen for the first time", () => {
  test("has its Prediction started, once", async () => {
    const { agent, visit } = await scoreboard();
    const [scheduled] = recordedSlate.events;
    espnSlate = todaysSlate(TODAY, [scheduled, finalEvent("900011")]);
    const started: string[] = [];
    await runInDurableObject(agent, (instance) => {
      vi.spyOn(
        instance as unknown as { startPrediction(game: Game): Promise<void> },
        "startPrediction",
      ).mockImplementation(async (game) => void started.push(game.id));
    });

    await visit();
    vi.setSystemTime(Date.now() + SLOW * 1000 + 1000);
    await visit();

    expect(started).toEqual([scheduled?.id, "900011"]);
  });
});

describe("catch-up", () => {
  const datedRequests = () =>
    espnRequests.flatMap((path) => (path.startsWith("scoreboard?dates=") ? [path.slice(17)] : []));

  /** A later visit: far enough on that first paint asks ESPN again. */
  async function nextVisit(visit: () => Promise<unknown>): Promise<void> {
    vi.setSystemTime(Date.now() + SLOW * 1000 + 1000);
    espnRequests = [];
    await visit();
  }

  test("the first visit after a gap records the finished games of each missed date", async () => {
    const { agent, visit } = await scoreboard();
    espnSlate = todaysSlate("2026-10-02", []);
    await visit();
    expect(datedRequests()).toEqual([]);

    espnDatedSlates.set("20261003", datedSlate(recordedFinals.events));
    espnSlate = todaysSlate("2026-10-05", []);
    await nextVisit(visit);

    // The last slate seen is fetched too: its games may have ended after anyone last looked.
    expect(datedRequests()).toEqual(["20261002", "20261003", "20261004"]);
    const ids = recordedFinals.events.map((event) => event.id);
    const rows = await db.query.games.findMany({
      where: (games, { inArray }) => inArray(games.id, ids),
    });
    expect(rows).toHaveLength(13);
    expect(new Set(rows.map((row) => row.date))).toEqual(new Set(["2026-10-03"]));
    // Standings and the 26 teams that played: no players, no games.
    const teams = rows.flatMap((row) => [row.homeTeamId, row.awayTeamId]);
    expect(new Set(teams).size).toBe(26);
    expect(await invalidatedTags()).toEqual(
      tagKeys(["standings", ...teams.map((id) => `team:${id}`)]),
    );
    const state = await runInDurableObject(agent, (instance) => instance.state);
    expect(state.invalidatedAt).toBe(new Date().toISOString());

    await nextVisit(visit);
    expect(datedRequests()).toEqual([]);
  });

  test("a game that was not finished on a missed date is not recorded", async () => {
    const { visit } = await scoreboard();
    espnSlate = todaysSlate("2026-10-02", []);
    await visit();

    espnDatedSlates.set("20261003", datedSlate([liveEvent("900201"), finalEvent("900202")]));
    espnSlate = todaysSlate("2026-10-04", []);
    await nextVisit(visit);

    expect(await getGameWithPlays(db, "900201")).toBeNull();
    expect(await getGameWithPlays(db, "900202")).not.toBeNull();
  });

  test("a gap longer than 30 days is walked 30 dates a poll, oldest first", async () => {
    const { visit } = await scoreboard();
    espnSlate = todaysSlate("2026-08-01", []);
    await visit();

    espnDatedSlates.set("20260801", datedSlate([finalEvent("900301")]));
    espnDatedSlates.set("20261003", datedSlate([finalEvent("900302")]));
    espnSlate = todaysSlate("2026-10-05", []);
    await nextVisit(visit);

    expect(datedRequests()).toHaveLength(30);
    expect(datedRequests().at(0)).toBe("20260801");
    expect(datedRequests().at(-1)).toBe("20260830");
    expect(await getGameWithPlays(db, "900301")).not.toBeNull();
    expect(await getGameWithPlays(db, "900302")).toBeNull();

    await nextVisit(visit);
    expect(datedRequests()).toHaveLength(30);
    expect(datedRequests().at(0)).toBe("20260831");
    expect(datedRequests().at(-1)).toBe("20260929");

    await nextVisit(visit);
    expect(datedRequests()).toEqual(["20260930", "20261001", "20261002", "20261003", "20261004"]);
    expect(await getGameWithPlays(db, "900302")).not.toBeNull();

    await nextVisit(visit);
    expect(datedRequests()).toEqual([]);
  });

  test("with a viewer connected the rest of a long gap follows on the polls, with no new visit", async () => {
    const { connect, visit, later } = await scoreboard();
    espnSlate = todaysSlate("2026-08-01", []);
    await visit();
    espnSlate = todaysSlate("2026-10-05", []);
    vi.setSystemTime(Date.now() + SLOW * 1000 + 1000);
    espnRequests = [];

    await connect();
    for (let polls = 0; polls < 3; polls += 1) {
      await later(0);
      await later(SLOW);
    }

    expect(datedRequests()).toHaveLength(65);
    expect(datedRequests().at(-1)).toBe("20261004");
  });

  test("a date that fails is taken up again by the next poll, after the dates before it", async () => {
    const { visit } = await scoreboard();
    espnSlate = todaysSlate("2026-10-02", []);
    await visit();

    espnDatedSlates.set("20261002", datedSlate([finalEvent("900401")]));
    espnDatedSlates.set("20261003", espnDown);
    espnSlate = todaysSlate("2026-10-05", []);
    await nextVisit(visit);
    expect(datedRequests()).toEqual(["20261002", "20261003"]);
    expect(await invalidatedTags()).toEqual(tagKeys(["standings", "team:2", "team:4"]));

    espnDatedSlates.set("20261003", datedSlate([finalEvent("900402")]));
    await nextVisit(visit);

    expect(datedRequests()).toEqual(["20261003", "20261004"]);
    expect(await getGameWithPlays(db, "900402")).not.toBeNull();
  });

  test("a date that fails three times is passed over, so the dates after it are reached", async () => {
    const { visit } = await scoreboard();
    espnSlate = todaysSlate("2026-10-02", []);
    await visit();

    espnDatedSlates.set("20261002", espnDown);
    espnDatedSlates.set("20261003", datedSlate([finalEvent("900501")]));
    espnSlate = todaysSlate("2026-10-04", []);
    await nextVisit(visit);
    await nextVisit(visit);
    expect(datedRequests()).toEqual(["20261002"]);
    expect(await getGameWithPlays(db, "900501")).toBeNull();

    await nextVisit(visit);
    expect(datedRequests()).toEqual(["20261002", "20261003"]);
    expect(await getGameWithPlays(db, "900501")).not.toBeNull();

    await nextVisit(visit);
    expect(datedRequests()).toEqual([]);
  });
});
