import { applyD1Migrations, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { createDb, getPrediction, insertPredictionIfAbsent } from "@yogan-hockey/db";
import type { StoredPrediction } from "@yogan-hockey/schemas";
import { getAgentByName } from "agents";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import recordedSlate from "../../../packages/espn/fixtures/scoreboard.json";
import recordedSummary from "../../../packages/espn/fixtures/summary-401892449.json";
import { FALLBACK_MODEL, PRIMARY_MODEL } from "./prediction";

/** Ahead of the real clock, as in `scoreboard-agent.test.ts`, so no schedule is due by itself. */
const NOW = Date.parse("2031-01-15T20:00:00Z");
const TODAY = "2031-01-15";
const TOMORROW = "2031-01-16";
const HOUR = 60 * 60;

/** Nashville (27) at Toronto (21): the game the recorded pre-game summary is of. */
const TORONTO = "21";

type SlateEvent = (typeof recordedSlate)["events"][number];

const db = createDb(env.DB);

/** ESPN's current slate. */
let espnSlate: () => Response;
/** ESPN's summary of any game. */
let espnSummary: () => Response;

function recordedEvent(): SlateEvent {
  const recorded = recordedSlate.events.find((event) => event.id === "401892449");
  if (!recorded) throw new Error("The recorded slate has lost Nashville at Toronto");
  return structuredClone(recorded);
}

/** Nashville at Toronto under an id of the test's own, still to be played. */
function scheduledEvent(id: string, startsInSeconds = 3 * HOUR): SlateEvent {
  const event = recordedEvent();
  event.id = id;
  event.date = new Date(NOW + startsInSeconds * 1000).toISOString();
  return event;
}

/** The same game once the puck has dropped. */
function liveEvent(id: string): SlateEvent {
  const event = scheduledEvent(id, -HOUR / 2);
  const type = event.competitions[0]?.status.type;
  if (!type) throw new Error("The recorded game has no status");
  Object.assign(type, { state: "in", completed: false });
  return event;
}

function slate(date: string, events: SlateEvent[]): () => Response {
  return () => Response.json({ ...recordedSlate, day: { date }, events });
}

/** ESPN's summary of the game after it has started. */
function startedSummary(): Response {
  const summary = structuredClone(recordedSummary);
  const type = summary.header.competitions[0]?.status.type;
  if (!type) throw new Error("The recorded summary has no status");
  Object.assign(type, { state: "in", completed: false });
  return Response.json(summary);
}

const pick = {
  pick: "TOR",
  winProbability: 58,
  reasoning:
    "Toronto is at home and has won three of its last five. Nashville has yet to win away.",
  keyFactors: ["Home ice", "Three wins in five"],
};

/** A model's answer as `gpt-oss-120b` gives it: the JSON as text in a chat completion. */
function answer(content: unknown) {
  return { choices: [{ message: { content: JSON.stringify(content) } }] };
}
const valid = answer(pick);
/** An answer that is JSON and is no Prediction: a team that is not playing. */
const invalid = answer({ ...pick, pick: "MTL" });
/** A call that fails outright. */
const down = new Error("Workers AI is unavailable");

type ModelCall = { model: string; request: { messages: { content: string }[] }; options: unknown };

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  espnSlate = slate(TODAY, []);
  espnSummary = () => Response.json(recordedSummary);
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(new Request(input, init).url);
    const path = url.pathname.replace(/^.*\/nhl\//, "");
    if (url.hostname === "site.api.espn.com" && path === "scoreboard") return espnSlate();
    if (url.hostname === "site.api.espn.com" && path === "summary") return espnSummary();
    throw new Error(`Unexpected fetch in a test: ${url}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

let instances = 0;

/**
 * A Scoreboard of this test's own, with the AI binding replaced by a stub that gives `answers`
 * in order and then keeps giving the last one. An `Error` is a call that throws, and a function
 * is run for its answer.
 */
async function scoreboard(...answers: unknown[]) {
  instances += 1;
  const agent = await getAgentByName(exports.ScoreboardAgent, `predictions-${instances}`);
  const calls: ModelCall[] = [];
  const ai = {
    async run(model: string, request: ModelCall["request"], options: unknown) {
      const given = answers[Math.min(calls.length, answers.length - 1)];
      calls.push({ model, request, options });
      if (given instanceof Error) throw given;
      if (typeof given === "function") return await given();
      return given;
    },
  };
  await runInDurableObject(agent, (instance) => {
    Object.assign(instance, { env: { ...env, AI: ai } });
  });

  /** A visit with nobody connected: first paint alone, which only notes what there is to do. */
  const firstPaint = () => agent.getScoreboard();

  /** Runs the Agent's timers until no Prediction is being worked on. */
  async function work(): Promise<void> {
    for (let runs = 0; runs < 100; runs += 1) {
      const schedules = await runInDurableObject(agent, (instance) => instance.listSchedules());
      if (!schedules.some((schedule) => schedule.callback === "makePredictions")) return;
      await runDurableObjectAlarm(agent);
    }
    throw new Error("The Predictions never finished");
  }

  /** A visit, and everything it sets off. */
  async function visit(): Promise<void> {
    await firstPaint();
    await work();
  }

  /** A later visit: far enough on that the Scoreboard asks ESPN again. */
  async function visitLater(seconds = 10 * 60): Promise<void> {
    vi.setSystemTime(Date.now() + seconds * 1000);
    await visit();
  }

  return { agent, calls, firstPaint, work, visit, visitLater };
}

const models = (calls: ModelCall[]) => calls.map((call) => call.model);

describe("a game seen on today's slate for the first time", () => {
  test("gets a Prediction from the model's first answer", async () => {
    const { calls, visit } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520001")]);

    await visit();

    expect(models(calls)).toEqual([PRIMARY_MODEL]);
    expect(await getPrediction(db, "520001")).toMatchObject({
      gameId: "520001",
      status: "made",
      pickTeamId: TORONTO,
      winProbability: 58,
      reasoning: pick.reasoning,
      keyFactors: pick.keyFactors,
      madeAt: new Date(NOW).toISOString(),
      model: PRIMARY_MODEL,
    });
  });

  test("is asked of the model through the AI Gateway, held to the schema's shape", async () => {
    const { calls, visit } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520002")]);

    await visit();

    expect(calls[0]?.options).toMatchObject({ gateway: { id: "yogan-hockey" } });
    expect(calls[0]?.request).toMatchObject({
      response_format: {
        type: "json_schema",
        json_schema: { properties: { pick: { enum: ["TOR", "NSH"] } } },
      },
    });
  });

  test("does not hold up first paint: the model is called from a timer afterwards", async () => {
    const { calls, firstPaint, work } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520003")]);

    const state = await firstPaint();

    expect(state.games.map((game) => game.id)).toEqual(["520003"]);
    expect(calls).toHaveLength(0);
    expect(await getPrediction(db, "520003")).toBeNull();

    await work();
    expect(calls).toHaveLength(1);
  });

  test("open pages are told when its Prediction arrives", async () => {
    const { agent, firstPaint, work } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520004")]);

    const before = await firstPaint();
    await work();

    const after = await runInDurableObject(agent, (instance) => instance.state);
    expect(before.invalidatedAt).toBeNull();
    expect(after.invalidatedAt).toBe(new Date(NOW).toISOString());
  });

  test("keeps as its inputs the facts the model was given", async () => {
    const { calls, visit } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520005")]);

    await visit();

    const row = await getPrediction(db, "520005");
    const [, facts] = calls[0]?.request.messages ?? [];
    expect(JSON.parse(facts?.content ?? "null")).toEqual(row?.inputs);
    expect(row?.inputs).toMatchObject({
      home: { team: "TOR", record: { overall: "1-2-0", home: "1-2-0" } },
      away: { team: "NSH", record: { overall: "1-1-0", road: "0-0-0" } },
    });
  });

  test("no betting line reaches the model or the stored inputs", async () => {
    // What ESPN sends with this game, so the test fails if the fixture ever stops carrying it.
    expect(recordedSummary.pickcenter[0]).toMatchObject({ details: "TOR -155", overUnder: 5.5 });
    const { calls, visit } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520006")]);

    await visit();

    const betting = /odds|money.?line|spread|over.?under|draftkings|pickcenter|-155|favou?rite/i;
    const row = await getPrediction(db, "520006");
    const [instructions, facts] = calls[0]?.request.messages ?? [];
    expect(JSON.stringify(row?.inputs)).not.toMatch(betting);
    expect(facts?.content).not.toMatch(betting);
    // The instructions name betting once, to forbid it.
    expect(instructions?.content.replace(/Never mention betting[^.]*\./, "")).not.toMatch(betting);
    expect(JSON.stringify(calls[0]?.request.messages)).not.toContain("-155");
  });
});

describe("a model answer that is not a Prediction", () => {
  test("is asked for once more of the same model", async () => {
    const { calls, visit } = await scoreboard(invalid, valid);
    espnSlate = slate(TODAY, [scheduledEvent("520101")]);

    await visit();

    expect(models(calls)).toEqual([PRIMARY_MODEL, PRIMARY_MODEL]);
    expect(await getPrediction(db, "520101")).toMatchObject({
      status: "made",
      pickTeamId: TORONTO,
      model: PRIMARY_MODEL,
    });
  });

  test("twice, and the fallback model is asked once", async () => {
    const { calls, visit } = await scoreboard(invalid, answer("not JSON at all"), valid);
    espnSlate = slate(TODAY, [scheduledEvent("520102")]);

    await visit();

    expect(models(calls)).toEqual([PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL]);
    expect(await getPrediction(db, "520102")).toMatchObject({
      status: "made",
      pickTeamId: TORONTO,
      model: FALLBACK_MODEL,
    });
  });

  test("a call that throws counts as one", async () => {
    const { calls, visit } = await scoreboard(down, down, valid);
    espnSlate = slate(TODAY, [scheduledEvent("520103")]);

    await visit();

    expect(models(calls)).toEqual([PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL]);
    expect(await getPrediction(db, "520103")).toMatchObject({ status: "made" });
  });

  test("three times, and a failed row is stored with what the model was given", async () => {
    const { calls, visit } = await scoreboard(invalid);
    espnSlate = slate(TODAY, [scheduledEvent("520104")]);

    await visit();

    const row = await getPrediction(db, "520104");
    expect(row).toMatchObject({
      gameId: "520104",
      status: "failed",
      model: FALLBACK_MODEL,
      madeAt: new Date(NOW).toISOString(),
      inputs: { home: { team: "TOR" }, away: { team: "NSH" } },
    });
    expect(row).not.toHaveProperty("pickTeamId");
    expect(calls).toHaveLength(3);
  });

  test("a game whose third call was cut short by a restart is marked failed, not asked again", async () => {
    const { agent, calls, firstPaint, work } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520106")]);
    await firstPaint();
    // What a restart during the last call leaves in storage: every call counted, no row.
    await runInDurableObject(agent, (_instance, state) => {
      const key = "pending-prediction:520106";
      const noted = state.storage.kv.get<Record<string, unknown>>(key);
      state.storage.kv.put(key, { ...noted, calls: 3, inputs: { home: {}, away: {} } });
    });

    await work();

    expect(calls).toHaveLength(0);
    expect(await getPrediction(db, "520106")).toMatchObject({
      status: "failed",
      model: FALLBACK_MODEL,
    });
  });

  test("a failed game is never tried again", async () => {
    const { calls, visit, visitLater } = await scoreboard(invalid, invalid, invalid, valid);
    espnSlate = slate(TODAY, [scheduledEvent("520105")]);
    await visit();

    await visitLater();
    // Even seen for the first time again: off the slate, then back on it.
    espnSlate = slate(TODAY, []);
    await visitLater();
    espnSlate = slate(TODAY, [scheduledEvent("520105")]);
    await visitLater();

    expect(calls).toHaveLength(3);
    expect(await getPrediction(db, "520105")).toMatchObject({ status: "failed" });
  });
});

describe("a game that has already started", () => {
  test("gets no Prediction when it is live the first time it is seen", async () => {
    const { calls, visit } = await scoreboard(valid);
    espnSlate = slate(TODAY, [liveEvent("520201")]);

    await visit();

    expect(calls).toHaveLength(0);
    expect(await getPrediction(db, "520201")).toBeNull();
  });

  test("gets none when its start time has passed, whatever ESPN calls it", async () => {
    const { calls, visit } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520202", -60)]);

    await visit();

    expect(calls).toHaveLength(0);
    expect(await getPrediction(db, "520202")).toBeNull();
  });

  test("gets none when it starts between being seen and being worked on", async () => {
    const { calls, firstPaint, work } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520203", 60)]);
    await firstPaint();

    vi.setSystemTime(NOW + 61 * 1000);
    await work();

    expect(calls).toHaveLength(0);
    expect(await getPrediction(db, "520203")).toBeNull();
  });

  test("gets none when it starts while the model is answering", async () => {
    const { calls, visit } = await scoreboard(() => {
      vi.setSystemTime(NOW + 61 * 1000);
      return valid;
    });
    espnSlate = slate(TODAY, [scheduledEvent("520205", 60)]);

    await visit();

    expect(calls).toHaveLength(1);
    expect(await getPrediction(db, "520205")).toBeNull();
  });

  test("a game put back to a later start still gets its Prediction before it", async () => {
    const { visit, visitLater } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520206", 60)]);
    espnSummary = () => new Response("Bad gateway", { status: 502 });
    await visit();

    // Two minutes on, past the start first given, ESPN has the game an hour later.
    espnSlate = slate(TODAY, [scheduledEvent("520206", 60 * 60)]);
    espnSummary = () => Response.json(recordedSummary);
    await visitLater(120);

    expect(await getPrediction(db, "520206")).toMatchObject({ status: "made" });
  });

  test("gets none when ESPN's summary says it is under way", async () => {
    const { calls, visit, visitLater } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520204")]);
    espnSummary = startedSummary;

    await visit();
    await visitLater();

    expect(calls).toHaveLength(0);
    expect(await getPrediction(db, "520204")).toBeNull();
  });
});

describe("one Prediction per game", () => {
  test("a game that already has a row is not asked about", async () => {
    const earlier: StoredPrediction = {
      gameId: "520301",
      status: "made",
      pickTeamId: "27",
      winProbability: 61,
      reasoning: "Made by an earlier trigger. It stands.",
      keyFactors: [],
      madeAt: "2031-01-15T19:00:00.000Z",
      model: PRIMARY_MODEL,
      inputs: {},
    };
    await insertPredictionIfAbsent(db, earlier);
    const { calls, visit } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520301")]);

    await visit();

    expect(calls).toHaveLength(0);
    expect(await getPrediction(db, "520301")).toEqual(earlier);
  });

  test("a game seen for the first time twice keeps the Prediction it was given", async () => {
    const other = answer({ ...pick, pick: "NSH", winProbability: 66 });
    const { calls, visit, visitLater } = await scoreboard(valid, other);
    espnSlate = slate(TODAY, [scheduledEvent("520302")]);
    await visit();

    espnSlate = slate(TODAY, []);
    await visitLater();
    espnSlate = slate(TODAY, [scheduledEvent("520302")]);
    await visitLater();

    expect(calls).toHaveLength(1);
    expect(await getPrediction(db, "520302")).toMatchObject({
      pickTeamId: TORONTO,
      winProbability: 58,
    });
  });

  test("a row written by someone else while the model was answering wins", async () => {
    const earlier: StoredPrediction = {
      gameId: "520303",
      status: "failed",
      madeAt: "2031-01-15T19:00:00.000Z",
      model: FALLBACK_MODEL,
      inputs: {},
    };
    // The other trigger's row lands between this one's check and its insert.
    const { calls, visit } = await scoreboard(async () => {
      await insertPredictionIfAbsent(db, earlier);
      return valid;
    });
    espnSlate = slate(TODAY, [scheduledEvent("520303")]);

    await visit();

    expect(calls).toHaveLength(1);
    expect(await getPrediction(db, "520303")).toEqual(earlier);
  });
});

describe("the daily cap of 40 model calls", () => {
  /** Fourteen games whose every answer is invalid would take 42 calls. */
  const ids = Array.from(
    { length: 14 },
    (_unused, index) => `5204${String(index).padStart(2, "0")}`,
  );

  test("stops the calls at 40 and leaves the game it cut short without a row", async () => {
    const { calls, visit, visitLater } = await scoreboard(invalid);
    espnSlate = slate(
      TODAY,
      ids.map((id) => scheduledEvent(id)),
    );

    await visit();
    await visitLater();

    expect(calls).toHaveLength(40);
    const rows = await Promise.all(ids.map((id) => getPrediction(db, id)));
    expect(rows.filter((row) => row?.status === "failed")).toHaveLength(13);
    expect(rows.filter((row) => row === null)).toHaveLength(1);
  });

  test("is a day's: on the next slate the game cut short has the calls it was still owed", async () => {
    const { calls, visit, visitLater } = await scoreboard(invalid);
    const later = ids.map((id) => id.replace(/^5204/, "5206"));
    const events = later.map((id) => scheduledEvent(id, 30 * HOUR));
    espnSlate = slate(TODAY, events);
    await visit();
    expect(calls).toHaveLength(40);

    espnSlate = slate(TOMORROW, events);
    await visitLater(20 * HOUR);

    // It had one call of its three on the first day.
    expect(calls).toHaveLength(42);
    expect(models(calls).slice(40)).toEqual([PRIMARY_MODEL, FALLBACK_MODEL]);
    const rows = await Promise.all(later.map((id) => getPrediction(db, id)));
    expect(rows.every((row) => row?.status === "failed")).toBe(true);
  });
});

describe("ESPN's pre-game summary cannot be read", () => {
  test("for one game, and the games after it get their Predictions all the same", async () => {
    const { calls, visit } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520504"), scheduledEvent("520505")]);
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = new URL(new Request(input).url);
      if (url.pathname.endsWith("/scoreboard")) return espnSlate();
      if (url.searchParams.get("event") === "520504") return new Response("", { status: 502 });
      return Response.json(recordedSummary);
    });

    await visit();

    expect(calls).toHaveLength(1);
    expect(await getPrediction(db, "520504")).toBeNull();
    expect(await getPrediction(db, "520505")).toMatchObject({ status: "made" });
  });

  test("it is asked for again on later polls, and the Prediction is made when it comes", async () => {
    const { calls, visit, visitLater } = await scoreboard(valid);
    espnSlate = slate(TODAY, [scheduledEvent("520501")]);
    espnSummary = () => new Response("Bad gateway", { status: 502 });
    await visit();
    expect(await getPrediction(db, "520501")).toBeNull();

    espnSummary = () => Response.json(recordedSummary);
    await visitLater();

    expect(calls).toHaveLength(1);
    expect(await getPrediction(db, "520501")).toMatchObject({ status: "made" });
  });

  test("after three tries, each on a poll of its own, the game is marked failed with no model called", async () => {
    const { calls, visit, visitLater } = await scoreboard(valid);
    // A second game is tried on the same polls: neither holds the other up, or hurries it.
    espnSlate = slate(TODAY, [scheduledEvent("520502"), scheduledEvent("520503")]);
    espnSummary = () => new Response("Bad gateway", { status: 502 });

    await visit();
    await visitLater();
    expect(await getPrediction(db, "520502")).toBeNull();
    await visitLater();

    expect(calls).toHaveLength(0);
    expect(await getPrediction(db, "520503")).toMatchObject({ status: "failed", inputs: {} });
    expect(await getPrediction(db, "520502")).toEqual({
      gameId: "520502",
      status: "failed",
      madeAt: new Date(NOW + 20 * 60 * 1000).toISOString(),
      model: PRIMARY_MODEL,
      inputs: {},
    });
  });
});
