import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import type { ScoreboardState } from "@yogan-hockey/schemas";
import { getAgentByName, routeAgentRequest } from "agents";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import recordedSlate from "../../../packages/espn/fixtures/scoreboard.json";
import { EspnAlert } from "./espn-alert";

/**
 * The clock the Agent sees. It is ahead of the real one on purpose: a schedule set by a clock
 * that is behind would be an alarm already due, which workerd would fire by itself.
 */
const NOW = Date.parse("2031-01-15T23:00:00Z");
const MINUTE = 60;
/** The slow cadence, in seconds. */
const SLOW = 5 * MINUTE;
/** The fast cadence, in seconds. */
const FAST = 30;

type RecordedEvent = (typeof recordedSlate)["events"][number];
type AgentMessage = { type: string; state?: ScoreboardState; error?: string; at?: string };

/** What ESPN answers a scoreboard request with. */
let espn: () => Response;
let espnRequests: number;
/** The log lines that say a problem started or cleared, oldest first. */
let alerts: string[];

/**
 * ESPN's answer: the recorded slate, every game moved to start `startsInMinutes` from now, then
 * edited. No recorded slate has a game in progress, and the cadence depends on start times.
 */
function slate(startsInMinutes: number, edit?: (events: RecordedEvent[]) => void): () => Response {
  const body = structuredClone(recordedSlate);
  const start = new Date(Date.now() + startsInMinutes * MINUTE * 1000).toISOString();
  for (const event of body.events) event.date = start;
  edit?.(body.events);
  return () => Response.json(body);
}

/** A slate whose games are hours away, so nothing calls for the fast cadence. */
const quietSlate = (edit?: (events: RecordedEvent[]) => void) => slate(180, edit);

/** Puts the first recorded game in progress, as the `packages/espn` tests do. */
function firstGameLive(homeScore: string) {
  return ([event]: RecordedEvent[]) => {
    const competition = event?.competitions[0];
    if (!competition) throw new Error("The recorded slate has no games");
    Object.assign(competition.status, { period: 2, displayClock: "12:34" });
    Object.assign(competition.status.type, { state: "in", shortDetail: "12:34 - 2nd" });
    for (const competitor of competition.competitors) {
      if (competitor.homeAway === "home") competitor.score = homeScore;
    }
  };
}

const espnDown = () => new Response("Bad gateway", { status: 502 });
/** JSON, and not a scoreboard. */
const espnChangedShape = () => Response.json({ events: "none" });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  espn = quietSlate();
  espnRequests = 0;
  alerts = [];
  // The alert shows in the Worker's logs and nowhere else, so its two lines are what is tested.
  const note = (...args: unknown[]) => {
    const line = String(args[0]);
    if (/ESPN problem (started|cleared)/.test(line)) alerts.push(line);
  };
  vi.spyOn(console, "error").mockImplementation(note);
  vi.spyOn(console, "log").mockImplementation(note);
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.hostname === "site.api.espn.com" && url.pathname.endsWith("/scoreboard")) {
      espnRequests += 1;
      return espn();
    }
    throw new Error(`Unexpected fetch in a test: ${request.url}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

let instances = 0;

/** A Scoreboard of this test's own, since the tests of one file share storage. */
async function scoreboard() {
  instances += 1;
  const name = `test-${instances}`;
  const agent = await getAgentByName(exports.ScoreboardAgent, name);
  // These slates are of games still to come, each of which would start a Prediction and leave
  // its one-off timer behind. Predictions have a file of their own
  // (`scoreboard-predictions.test.ts`); here the only timer is the poll's.
  await runInDurableObject(agent, (instance) => {
    vi.spyOn(
      instance as unknown as { startPrediction(): Promise<void> },
      "startPrediction",
    ).mockResolvedValue();
  });

  const viewers = () =>
    runInDurableObject(agent, (instance) => [...instance.getConnections()].length);

  /** Opens a socket the way a browser's `useAgent` does, through the Worker's own routing. */
  async function connect() {
    const response = await routeAgentRequest(
      new Request(`http://localhost/agents/scoreboard-agent/${name}`, {
        headers: { Upgrade: "websocket" },
      }),
      env,
    );
    const socket = response?.webSocket;
    if (!socket) throw new Error(`No socket: HTTP ${response?.status}`);
    const messages: AgentMessage[] = [];
    socket.addEventListener("message", (event) => {
      messages.push(JSON.parse(String(event.data)));
    });
    socket.accept();
    return {
      socket,
      messages,
      /** Every state the Agent has pushed to this socket, oldest first. */
      states: () => messages.flatMap((message) => (message.state ? [message.state] : [])),
      /** Closes the socket and waits until the Agent has seen it go. */
      async leave() {
        const before = await viewers();
        socket.close(1000, "left");
        await vi.waitFor(async () => expect(await viewers()).toBe(before - 1));
      },
    };
  }

  /** Moves the clock on and fires the Agent's alarm if it has one. True when one fired. */
  async function later(seconds: number): Promise<boolean> {
    vi.setSystemTime(Date.now() + seconds * 1000);
    return runDurableObjectAlarm(agent);
  }

  /**
   * Restarts the Agent as a deploy does: its memory goes, its storage and its sockets stay.
   * Eviction waits on the real clock, so the faked one steps aside for it.
   */
  async function restart(): Promise<void> {
    const now = Date.now();
    vi.useRealTimers();
    await evictDurableObject(agent);
    vi.useFakeTimers({ toFake: ["Date"], now });
  }

  return { agent, connect, later, restart };
}

describe("polling follows the viewers", () => {
  test("nobody connected: first paint fetches once and no timer is left behind", async () => {
    const { agent, later } = await scoreboard();

    await agent.getScoreboard();

    expect(espnRequests).toBe(1);
    expect(await later(SLOW)).toBe(false);
    expect(espnRequests).toBe(1);
  });

  test("starts on the first connection and stops when the last one leaves", async () => {
    const { connect, later } = await scoreboard();

    const first = await connect();
    await later(0);
    expect(espnRequests).toBe(1);
    const second = await connect();
    await later(SLOW);
    expect(espnRequests).toBe(2);

    await first.leave();
    await later(SLOW);
    expect(espnRequests).toBe(3);

    await second.leave();
    expect(await later(SLOW)).toBe(false);
    expect(espnRequests).toBe(3);
  });

  test("a second viewer does not start a second loop", async () => {
    const { connect, later } = await scoreboard();
    await connect();
    await connect();

    await later(0);
    await later(SLOW);

    expect(espnRequests).toBe(2);
  });

  test("a restart resumes from stored state: the games, the viewers and the timer", async () => {
    const { agent, connect, later, restart } = await scoreboard();
    // Up to the restart ESPN is the package's own fixture mode: an Agent that has awaited this
    // file's `fetch` cannot be evicted. The recorded games start in 2026, which is the past
    // here, so the cadence is the fast one.
    vi.stubEnv("ESPN_FIXTURES", "1");
    await connect();
    await later(0);
    const before = await agent.getScoreboard();
    expect(before.games).toHaveLength(9);

    // Something only the Agent's memory holds, to see that the restart took it.
    await runInDurableObject(agent, (instance) => Object.assign(instance, { beforeRestart: true }));
    await restart();
    vi.unstubAllEnvs();
    expect(await runInDurableObject(agent, (instance) => "beforeRestart" in instance)).toBe(false);

    expect(await agent.getScoreboard()).toEqual(before);
    expect(espnRequests).toBe(0);
    // The timer set before the restart fires, and the viewer is still there to keep it going.
    await later(FAST);
    expect(espnRequests).toBe(1);
    await later(SLOW);
    expect(espnRequests).toBe(2);
  });
});

describe("cadence", () => {
  test("every 5 minutes when no game is live or about to start", async () => {
    const { connect, later } = await scoreboard();
    await connect();
    await later(0);

    await later(SLOW - 1);
    expect(espnRequests).toBe(1);
    await later(1);
    expect(espnRequests).toBe(2);
  });

  test("every 30 seconds while a game is live, and back to 5 minutes after", async () => {
    const { connect, later } = await scoreboard();
    await connect();
    espn = quietSlate(firstGameLive("1"));
    await later(0);

    await later(FAST - 1);
    expect(espnRequests).toBe(1);
    await later(1);
    expect(espnRequests).toBe(2);

    espn = quietSlate();
    await later(FAST);
    expect(espnRequests).toBe(3);
    await later(FAST);
    expect(espnRequests).toBe(3);
    await later(SLOW - FAST);
    expect(espnRequests).toBe(4);
  });

  test("every 30 seconds from 15 minutes before a scheduled start", async () => {
    const { connect, later } = await scoreboard();
    await connect();
    espn = slate(21);
    await later(0);

    // 21 minutes out: the next poll waits for the 15-minute mark, 6 minutes on, not for 5.
    await later(SLOW);
    expect(espnRequests).toBe(2);
    await later(59);
    expect(espnRequests).toBe(2);
    // At 15 minutes out, and from there every 30 seconds.
    await later(1);
    expect(espnRequests).toBe(3);
    await later(FAST);
    expect(espnRequests).toBe(4);
  });
});

describe("first paint", () => {
  test("answers from stored state while it is younger than one polling interval", async () => {
    const { agent, later } = await scoreboard();
    const first = await agent.getScoreboard();

    await later(SLOW);
    const second = await agent.getScoreboard();

    expect(second).toEqual(first);
    expect(espnRequests).toBe(1);
  });

  test("fetches from ESPN first when stored state is older than one polling interval", async () => {
    const { agent, later } = await scoreboard();
    await agent.getScoreboard();
    espn = quietSlate(firstGameLive("3"));

    await later(SLOW + 1);
    const state = await agent.getScoreboard();

    expect(espnRequests).toBe(2);
    expect(state.games[0]).toMatchObject({ status: "live", home: { score: 3 } });
  });

  test("the interval that counts is the current one: 30 seconds with a game live", async () => {
    const { agent, later } = await scoreboard();
    espn = quietSlate(firstGameLive("1"));
    await agent.getScoreboard();

    await later(FAST + 1);
    await agent.getScoreboard();

    expect(espnRequests).toBe(2);
  });

  test("the state is today's games, cut down to what the ticker and /nhl/live draw", async () => {
    const { agent } = await scoreboard();
    espn = quietSlate(firstGameLive("2"));

    const state = await agent.getScoreboard();

    expect(state.date).toBe("2026-10-06");
    expect(state.updatedAt).toBe(new Date(NOW).toISOString());
    expect(state.games).toHaveLength(9);
    expect(state.games[0]).toEqual({
      id: "401891815",
      startTime: new Date(NOW + 180 * MINUTE * 1000).toISOString(),
      seasonType: 2,
      status: "live",
      period: 2,
      clock: "12:34",
      detail: "12:34 - 2nd",
      venue: "Bell Centre",
      broadcasts: ["ESPN+", "CARNHL"],
      home: {
        id: "10",
        abbreviation: "MTL",
        logo: "https://a.espncdn.com/i/teamlogos/nhl/500/scoreboard/mtl.png",
        logoDark: null,
        score: 2,
        winner: false,
        record: "1-0-1",
      },
      away: {
        id: "7",
        abbreviation: "CAR",
        logo: "https://a.espncdn.com/i/teamlogos/nhl/500/scoreboard/car.png",
        logoDark: null,
        score: 0,
        winner: false,
        record: "1-1-1",
      },
    });
  });

  test("when ESPN fails, the answer is the games as last seen", async () => {
    const { agent, later } = await scoreboard();
    const seen = await agent.getScoreboard();
    espn = espnDown;

    await later(SLOW + 1);

    expect(await agent.getScoreboard()).toEqual(seen);
    expect(espnRequests).toBe(2);
  });
});

describe("what viewers are sent", () => {
  test("a poll pushes state only when something changed", async () => {
    const { connect, later } = await scoreboard();
    espn = quietSlate(firstGameLive("1"));
    const viewer = await connect();
    await later(0);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.games).toHaveLength(9));
    const sent = viewer.states().length;

    // The same slate again, then a goal. Only the goal is pushed.
    await later(FAST);
    espn = quietSlate(firstGameLive("2"));
    await later(FAST);

    await vi.waitFor(() => expect(viewer.states().at(-1)?.games[0]?.home.score).toBe(2));
    expect(viewer.states()).toHaveLength(sent + 1);
    expect(espnRequests).toBe(3);
  });

  test("a poll that finds nothing new sends only the time ESPN was heard from", async () => {
    const { agent, connect, later } = await scoreboard();
    const viewer = await connect();
    await later(0);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.games).toHaveLength(9));
    const sent = viewer.states().length;
    const changedAt = viewer.states().at(-1)?.updatedAt;
    expect(changedAt).toBe(new Date(NOW).toISOString());

    await later(SLOW);

    // Read at once: waiting moves the faked clock on.
    const heardAt = new Date(Date.now()).toISOString();
    await vi.waitFor(() =>
      expect(viewer.messages).toContainEqual({ type: "scoreboard_heard", at: heardAt }),
    );
    expect(viewer.states()).toHaveLength(sent);
    // First paint for the next visitor says the same: heard from just now, changed back then.
    expect(await agent.getScoreboard()).toMatchObject({ updatedAt: changedAt, heardAt });
  });

  test("a failed poll leaves the time ESPN was heard from where it was", async () => {
    const { agent, later } = await scoreboard();
    const { heardAt } = await agent.getScoreboard();
    expect(heardAt).toBe(new Date(NOW).toISOString());
    espn = espnDown;

    await later(SLOW + 1);

    expect((await agent.getScoreboard()).heardAt).toBe(heardAt);
  });

  test("a browser's attempt to write the state is refused", async () => {
    const { agent, connect } = await scoreboard();
    const before = await agent.getScoreboard();
    const viewer = await connect();

    viewer.socket.send(
      JSON.stringify({
        type: "cf_agent_state",
        state: { date: "2031-01-15", games: [], updatedAt: null },
      }),
    );

    await vi.waitFor(() =>
      expect(viewer.messages).toContainEqual({
        type: "cf_agent_state_error",
        error: "Connection is readonly",
      }),
    );
    expect(await agent.getScoreboard()).toEqual(before);
  });
});

describe("alerts", () => {
  test("three failed polls in a row log that a problem started, once, and the next good poll that it cleared", async () => {
    const { connect, later } = await scoreboard();
    await connect();
    await later(0);
    espn = espnDown;

    await later(SLOW);
    await later(SLOW);
    expect(alerts).toEqual([]);

    await later(SLOW);
    expect(alerts).toEqual([
      "Scoreboard: ESPN problem started: ESPN scoreboard could not be fetched: HTTP 502",
    ]);

    await later(SLOW);
    expect(alerts).toHaveLength(1);

    espn = quietSlate();
    await later(SLOW);
    expect(alerts).toHaveLength(2);
    expect(alerts[1]).toBe("Scoreboard: ESPN problem cleared");

    await later(SLOW);
    expect(alerts).toHaveLength(2);
  });

  test("a good poll between failures starts the count again", async () => {
    const { connect, later } = await scoreboard();
    await connect();
    espn = espnDown;
    await later(0);
    await later(SLOW);

    espn = quietSlate();
    await later(SLOW);
    espn = espnDown;
    await later(SLOW);
    await later(SLOW);

    expect(alerts).toEqual([]);
  });

  test("one response that does not parse logs that a problem started, and the next good poll that it cleared", async () => {
    const { connect, later } = await scoreboard();
    await connect();
    espn = espnChangedShape;

    await later(0);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatch(
      /^Scoreboard: ESPN problem started: ESPN scoreboard did not parse: events: /,
    );

    await later(SLOW);
    expect(alerts).toHaveLength(1);

    espn = quietSlate();
    await later(SLOW);
    expect(alerts).toHaveLength(2);
    expect(alerts[1]).toBe("Scoreboard: ESPN problem cleared");
  });

  test("an open problem is kept in storage: a restarted Agent neither repeats it nor forgets to clear it", async () => {
    const { agent } = await scoreboard();

    await runInDurableObject(agent, async (_instance, { storage }) => {
      const alert = new EspnAlert(storage, "Test");
      await alert.failed(new Error("first"));
      await alert.failed(new Error("second"));
      await alert.failed(new Error("third"));
      expect(alert.failures).toBe(3);
      expect(alerts).toEqual(["Test: ESPN problem started: third"]);

      // A new helper over the same storage, as after a restart.
      const restarted = new EspnAlert(storage, "Test");
      expect(restarted.failures).toBe(3);
      await restarted.failed(new Error("fourth"));
      expect(alerts).toHaveLength(1);
      await restarted.succeeded();
      expect(restarted.failures).toBe(0);
    });

    expect(alerts).toEqual(["Test: ESPN problem started: third", "Test: ESPN problem cleared"]);
  });
});
