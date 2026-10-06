import {
  applyD1Migrations,
  evictDurableObject,
  runDurableObjectAlarm,
  runInDurableObject,
} from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { createDb, gameHasPlays, getGameWithPlays } from "@yogan-hockey/db";
import { translateGameSummary } from "@yogan-hockey/espn";
import {
  applyGameStreamMessage,
  type GameStreamMessage,
  type GameStreamState,
  type GameSummary,
  type Play,
  parseGameStreamMessage,
} from "@yogan-hockey/schemas";
import { getAgentByName, routeAgentRequest } from "agents";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import recordedGame from "../../../packages/espn/fixtures/summary-401803652.json";
import recordedScheduledGame from "../../../packages/espn/fixtures/summary-401892449.json";

/**
 * The game these tests play is the recorded shootout, Dallas 4 at Buffalo 3 (307 plays), cut
 * short: no game was in progress when this was written, so there is no recorded live sequence.
 * "ESPN part-way through" is the recorded response with its first N plays and a status of in
 * progress, put through the real parser. Its landmarks: play 12 is the first goal, play 97 the end
 * of the 1st period, play 98 the start of the 2nd.
 */
type RecordedGame = typeof recordedGame;
type Push = { title: string | null };
type StateMessage = { type: string; state?: GameStreamState; error?: string };

/** The clock the Agent sees, ahead of the real one so that no schedule is due by itself. */
const NOW = Date.parse("2031-01-15T23:00:00Z");
const HOUR = 60 * 60;
/** The cadences, in seconds. */
const IN_PLAY = 10;
const INTERMISSION = 30;
const IDLE = 5 * 60;
/** How long after a game is seen to end its last poll and the write to D1 come. */
const LAST_POLL = 30;

const EVERY_PLAY = recordedGame.plays.length;
const END_OF_FIRST = 98;

const db = createDb(env.DB);

/** What ESPN answers a summary request with, by event id. */
let espn: Map<string, () => Response | Promise<Response>>;
let espnRequests: number;
let pushes: Push[];

const espnDown = () => new Response("Bad gateway", { status: 502 });
const espnHasNoSuchGame = () => new Response("Not found", { status: 404 });

/** ESPN's summary of game `id` once `plays` plays have happened, then edited. */
function recorded(id: string, plays: number, edit?: (body: RecordedGame) => void): RecordedGame {
  const body = structuredClone(recordedGame);
  body.header.id = id;
  body.plays = body.plays.slice(0, plays);
  edit?.(body);
  return body;
}

function inProgress(body: RecordedGame): void {
  const status = body.header.competitions[0]?.status;
  if (!status) throw new Error("The recorded game has no status");
  Object.assign(status.type, { state: "in", completed: false, shortDetail: "In Progress" });
}

function setScore(body: RecordedGame, side: "home" | "away", score: string): void {
  for (const competitor of body.header.competitions[0]?.competitors ?? []) {
    if (competitor.homeAway === side) competitor.score = score;
  }
}

/** The game in progress after `plays` plays. */
function live(id: string, plays: number, edit?: (body: RecordedGame) => void): () => Response {
  const body = recorded(id, plays, (game) => {
    inProgress(game);
    edit?.(game);
  });
  return () => Response.json(body);
}

/** The game over, as recorded. */
function final(id: string): () => Response {
  const body = recorded(id, EVERY_PLAY);
  return () => Response.json(body);
}

/** A game still to start: Nashville at Toronto as recorded, starting `hours` from now. */
function scheduled(id: string, hours: number): () => Response {
  const body = structuredClone(recordedScheduledGame);
  body.header.id = id;
  const [competition] = body.header.competitions;
  if (!competition) throw new Error("The recorded game has no competition");
  competition.date = new Date(Date.now() + hours * HOUR * 1000).toISOString();
  return () => Response.json(body);
}

const ids = (plays: Play[]) => plays.map((play) => play.id);
const recordedIds = (count: number) => recordedGame.plays.slice(0, count).map((play) => play.id);

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  espn = new Map();
  espnRequests = 0;
  pushes = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.hostname === "site.api.espn.com" && url.pathname.endsWith("/summary")) {
      espnRequests += 1;
      const answer = espn.get(url.searchParams.get("event") ?? "");
      return answer ? answer() : espnHasNoSuchGame();
    }
    if (url.hostname === "ntfy.sh") {
      pushes.push({ title: request.headers.get("Title") });
      return new Response("{}");
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

let games = 0;

/** A game of this test's own: the tests of one file share Durable Object storage and D1. */
async function game() {
  games += 1;
  const id = `94800${games}`;
  const agent = await getAgentByName(exports.GameAgent, id);

  const viewers = () =>
    runInDurableObject(agent, (instance) => [...instance.getConnections()].length);

  /** Opens a socket the way a game page's `useAgent` does, through the Worker's own routing. */
  async function connect() {
    const response = await routeAgentRequest(
      new Request(`http://localhost/agents/game-agent/${id}`, {
        headers: { Upgrade: "websocket" },
      }),
      env,
    );
    const socket = response?.webSocket;
    if (!socket) throw new Error(`No socket: HTTP ${response?.status}`);
    const received: string[] = [];
    socket.addEventListener("message", (event) => {
      received.push(String(event.data));
    });
    socket.accept();
    /** What the Agent has sent this socket about plays, oldest first. */
    const playMessages = () =>
      received.flatMap((data) => parseGameStreamMessage(data) ?? ([] as GameStreamMessage[]));
    return {
      socket,
      playMessages,
      /** The plays a page holds: every message so far put through the page's reducer. */
      plays: () => playMessages().reduce(applyGameStreamMessage, [] as Play[]),
      /** Every message that is not about plays: the Agents SDK's own. */
      sdkMessages: () =>
        received.flatMap((data) =>
          parseGameStreamMessage(data) ? [] : [JSON.parse(data) as StateMessage],
        ),
      /** Every state the Agent has pushed to this socket, oldest first. */
      states() {
        return this.sdkMessages().flatMap((message) => (message.state ? [message.state] : []));
      },
      /** Closes the socket and waits until the Agent has seen it go. */
      async leave() {
        const before = await viewers();
        socket.close(1000, "left");
        await vi.waitFor(async () => expect(await viewers()).toBe(before - 1));
      },
    };
  }

  /** Moves the clock on and fires the Agent's alarm if it has one. True when one was set. */
  async function later(seconds: number): Promise<boolean> {
    vi.setSystemTime(Date.now() + seconds * 1000);
    return runDurableObjectAlarm(agent);
  }

  /** The names of the Agent's timers still to fire. */
  const timers = () =>
    runInDurableObject(agent, async (instance) =>
      (await instance.listSchedules()).map((schedule) => schedule.callback).sort(),
    );

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

  return { id, agent, connect, later, timers, restart };
}

describe("polling follows the viewers", () => {
  test("nobody connected: first paint fetches once and no timer is left behind", async () => {
    const { id, agent, later, timers } = await game();
    espn.set(id, live(id, 50));

    const snapshot = await agent.getGame();

    expect(snapshot.header?.status).toBe("live");
    expect(snapshot.plays).toHaveLength(50);
    expect(espnRequests).toBe(1);
    expect(await timers()).toEqual([]);
    expect(await later(IN_PLAY)).toBe(false);
    expect(espnRequests).toBe(1);
  });

  test("starts on the first connection and stops when the last one leaves", async () => {
    const { id, connect, later, timers } = await game();
    espn.set(id, live(id, 50));

    const first = await connect();
    await later(0);
    expect(espnRequests).toBe(1);
    const second = await connect();
    await later(IN_PLAY);
    expect(espnRequests).toBe(2);

    await first.leave();
    await later(IN_PLAY);
    expect(espnRequests).toBe(3);

    await second.leave();
    expect(await timers()).toEqual([]);
    expect(await later(IN_PLAY)).toBe(false);
    expect(espnRequests).toBe(3);
  });

  test("every 10 seconds while play is in progress", async () => {
    const { id, connect, later } = await game();
    espn.set(id, live(id, 50));
    await connect();
    await later(0);

    await later(IN_PLAY - 1);
    expect(espnRequests).toBe(1);
    await later(1);
    expect(espnRequests).toBe(2);
  });

  test("every 30 seconds in an intermission, and 10 again when the next period starts", async () => {
    const { id, connect, later } = await game();
    espn.set(id, live(id, END_OF_FIRST));
    await connect();
    await later(0);

    await later(INTERMISSION - 1);
    expect(espnRequests).toBe(1);
    espn.set(id, live(id, END_OF_FIRST + 1));
    await later(1);
    expect(espnRequests).toBe(2);

    await later(IN_PLAY);
    expect(espnRequests).toBe(3);
  });
});

describe("what a viewer is sent about plays", () => {
  test("on connect, every play so far in ESPN's order", async () => {
    const { id, agent, connect } = await game();
    espn.set(id, live(id, 50));
    await agent.getGame();

    const viewer = await connect();

    await vi.waitFor(() => expect(viewer.playMessages()).toHaveLength(1));
    const [message] = viewer.playMessages();
    expect(message?.type).toBe("plays");
    expect(ids(viewer.plays())).toEqual(recordedIds(50));
    expect(viewer.plays()[12]).toMatchObject({ type: "goal", scoring: true, period: 1 });
  });

  test("one message for each new play, which is then stored", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, live(id, 50));
    await agent.getGame();
    const viewer = await connect();

    espn.set(id, live(id, 53));
    await later(IN_PLAY);

    await vi.waitFor(() => expect(viewer.playMessages()).toHaveLength(4));
    expect(viewer.playMessages().slice(1)).toMatchObject([
      { type: "play-added", index: 50, play: { id: recordedGame.plays[50]?.id } },
      { type: "play-added", index: 51, play: { id: recordedGame.plays[51]?.id } },
      { type: "play-added", index: 52, play: { id: recordedGame.plays[52]?.id } },
    ]);
    const { plays } = await agent.getGame();
    expect(ids(plays)).toEqual(recordedIds(53));
    expect(viewer.plays()).toEqual(plays);
  });

  test("a play ESPN revises is one update, with nothing said of the rest", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, live(id, 50));
    await agent.getGame();
    const viewer = await connect();

    espn.set(
      id,
      live(id, 50, (body) => {
        const revised = body.plays[10];
        if (revised) revised.text = "Revised by the scorer";
      }),
    );
    await later(IN_PLAY);

    await vi.waitFor(() => expect(viewer.playMessages()).toHaveLength(2));
    expect(viewer.playMessages()[1]).toMatchObject({
      type: "play-changed",
      index: 10,
      play: { id: recordedGame.plays[10]?.id, text: "Revised by the scorer" },
    });
    const { plays } = await agent.getGame();
    expect(plays).toHaveLength(50);
    expect(plays[10]?.text).toBe("Revised by the scorer");
    expect(viewer.plays()).toEqual(plays);
  });

  test("a play missing from ESPN's new list is one removal", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, live(id, 50));
    await agent.getGame();
    const viewer = await connect();

    espn.set(
      id,
      live(id, 50, (body) => {
        body.plays.splice(20, 1);
      }),
    );
    await later(IN_PLAY);

    await vi.waitFor(() => expect(viewer.playMessages()).toHaveLength(2));
    expect(viewer.playMessages()[1]).toEqual({
      type: "play-removed",
      id: recordedGame.plays[20]?.id,
    });
    const { plays } = await agent.getGame();
    expect(ids(plays)).toEqual(recordedIds(50).toSpliced(20, 1));
    expect(viewer.plays()).toEqual(plays);
  });

  test("the order kept is ESPN's list, whatever the sequence numbers say", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, live(id, 50));
    await agent.getGame();
    const viewer = await connect();

    // Two plays change places in the list and keep their sequence numbers.
    espn.set(
      id,
      live(id, 50, (body) => {
        const [earlier, later] = [body.plays[30], body.plays[31]];
        if (!earlier || !later) throw new Error("The recorded game is too short");
        body.plays.splice(30, 2, later, earlier);
      }),
    );
    await later(IN_PLAY);

    const expected = [
      ...recordedIds(30),
      ...recordedIds(32).slice(30).reverse(),
      ...recordedIds(50).slice(32),
    ];
    await vi.waitFor(() => expect(ids(viewer.plays())).toEqual(expected));
    expect(ids((await agent.getGame()).plays)).toEqual(expected);
  });

  test("a play ESPN lists twice is kept once", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, live(id, 50));
    await agent.getGame();
    const viewer = await connect();

    espn.set(
      id,
      live(id, 51, (body) => {
        const repeated = body.plays[50];
        if (repeated) body.plays.push(structuredClone(repeated));
      }),
    );
    await later(IN_PLAY);

    await vi.waitFor(() => expect(ids(viewer.plays())).toEqual(recordedIds(51)));
    expect(ids((await agent.getGame()).plays)).toEqual(recordedIds(51));
  });

  test("a poll that finds a great many differences sends every play once instead", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, live(id, 50));
    await agent.getGame();
    const viewer = await connect();

    espn.set(id, live(id, 150));
    await later(IN_PLAY);

    await vi.waitFor(() => expect(viewer.playMessages()).toHaveLength(2));
    expect(viewer.playMessages()[1]?.type).toBe("plays");
    expect(ids(viewer.plays())).toEqual(recordedIds(150));
  });

  test("a browser's attempt to write the state is refused", async () => {
    const { id, agent, connect } = await game();
    espn.set(id, live(id, 50));
    const before = await agent.getGame();
    const viewer = await connect();

    viewer.socket.send(
      JSON.stringify({
        type: "cf_agent_state",
        state: { header: null, delayed: true, archived: true },
      }),
    );

    await vi.waitFor(() =>
      expect(viewer.sdkMessages()).toContainEqual({
        type: "cf_agent_state_error",
        error: "Connection is readonly",
      }),
    );
    expect(await agent.getGame()).toEqual(before);
  });
});

describe("the header", () => {
  test("is the synced state: score, shots, period, clock and status, and no plays", async () => {
    const { id, connect, later } = await game();
    espn.set(
      id,
      live(id, 50, (body) => {
        setScore(body, "home", "1");
        setScore(body, "away", "0");
      }),
    );
    const viewer = await connect();
    await later(0);

    await vi.waitFor(() => expect(viewer.states().at(-1)?.header).not.toBeNull());
    const state = viewer.states().at(-1);
    expect(state).toMatchObject({
      delayed: false,
      archived: false,
      header: {
        id,
        status: "live",
        period: 1,
        clock: "0:00",
        home: { abbreviation: "BUF", score: 1, shots: 24 },
        away: { abbreviation: "DAL", score: 0, shots: 28 },
      },
    });
    expect(Object.keys(state ?? {}).sort()).toEqual(["archived", "delayed", "header"]);
  });

  test("the score follows ESPN down as well as up, and is pushed only when it changes", async () => {
    const { id, connect, later } = await game();
    const score = (home: string) => live(id, 50, (body) => setScore(body, "home", home));
    espn.set(id, score("2"));
    const viewer = await connect();
    await later(0);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.header?.home.score).toBe(2));
    const sent = viewer.states().length;

    // The same again, then a goal taken back.
    await later(IN_PLAY);
    espn.set(id, score("1"));
    await later(IN_PLAY);

    await vi.waitFor(() => expect(viewer.states().at(-1)?.header?.home.score).toBe(1));
    expect(viewer.states()).toHaveLength(sent + 1);
    expect(viewer.playMessages()).toHaveLength(2);
  });
});

describe("the stall", () => {
  test("three failed polls in a row set `delayed`; the next good poll clears it", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, live(id, 50));
    const viewer = await connect();
    await later(0);

    espn.set(id, espnDown);
    await later(IN_PLAY);
    await later(IN_PLAY);
    expect((await agent.getGame()).delayed).toBe(false);
    await later(IN_PLAY);

    await vi.waitFor(() => expect(viewer.states().at(-1)?.delayed).toBe(true));
    // The last state stays up under the warning.
    expect(viewer.states().at(-1)?.header?.status).toBe("live");
    expect(ids(viewer.plays())).toEqual(recordedIds(50));
    expect(pushes).toEqual([{ title: `Game ${id}: ESPN problem` }]);

    espn.set(id, live(id, 51));
    await later(IN_PLAY);

    await vi.waitFor(() => expect(viewer.states().at(-1)?.delayed).toBe(false));
    expect(ids(viewer.plays())).toEqual(recordedIds(51));
    expect(pushes.at(-1)).toEqual({ title: `Game ${id}: ESPN recovered` });
  });

  test("a quiet stretch of good polls is not a stall", async () => {
    const { id, connect, later } = await game();
    espn.set(id, live(id, 50));
    const viewer = await connect();
    await later(0);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.header).not.toBeNull());
    const sent = viewer.states().length;

    for (let poll = 0; poll < 6; poll++) await later(IN_PLAY);

    expect(espnRequests).toBe(7);
    expect(viewer.states()).toHaveLength(sent);
    expect(viewer.states().at(-1)?.delayed).toBe(false);
    expect(pushes).toEqual([]);
  });
});

describe("the final", () => {
  test("one last poll, the game and every play in D1, viewers told, and no more polling", async () => {
    const { id, agent, connect, later, timers } = await game();
    espn.set(id, live(id, 300));
    const viewer = await connect();
    await later(0);

    // ESPN calls it final before the last two plays are in.
    const early = recorded(id, EVERY_PLAY - 2);
    espn.set(id, () => Response.json(early));
    await later(IN_PLAY);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.header?.status).toBe("final"));
    expect(viewer.states().at(-1)?.archived).toBe(false);
    expect(await gameHasPlays(db, id)).toBe(false);
    expect(await timers()).toEqual(["archive"]);

    // Half a minute on: the last poll, then the write to D1.
    espn.set(id, final(id));
    await later(LAST_POLL - 1);
    expect(espnRequests).toBe(2);
    await later(1);

    expect(espnRequests).toBe(3);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.archived).toBe(true));
    expect(viewer.states().at(-1)?.header).toMatchObject({
      status: "final",
      home: { score: 3, winner: false },
      away: { score: 4, winner: true },
    });
    expect(ids(viewer.plays())).toEqual(recordedIds(EVERY_PLAY));

    const archived = await getGameWithPlays(db, id);
    expect(archived?.game).toMatchObject({
      id,
      home: { abbreviation: "BUF", score: 3 },
      away: { abbreviation: "DAL", score: 4 },
    });
    expect(ids(archived?.plays ?? [])).toEqual(recordedIds(EVERY_PLAY));
    expect(archived?.plays).toEqual(viewer.plays());

    // The schedule is cancelled: what is left is the re-read, a day away.
    expect(await timers()).toEqual(["rereadPlays"]);
    await later(INTERMISSION);
    await later(IDLE);
    expect(espnRequests).toBe(3);
    expect((await agent.getGame()).plays).toEqual(archived?.plays);
    expect(espnRequests).toBe(3);
  });

  test("a day later the archived plays are read from ESPN again", async () => {
    const { id, connect, later, timers } = await game();
    espn.set(id, final(id));
    await connect();
    await later(0);
    await later(0);
    expect(await gameHasPlays(db, id)).toBe(true);

    // ESPN has since corrected a play.
    const corrected = recorded(id, EVERY_PLAY, (body) => {
      const play = body.plays[12];
      if (play) play.text = "Corrected overnight";
    });
    espn.set(id, () => Response.json(corrected));
    await later(24 * HOUR);

    expect(espnRequests).toBe(2);
    expect((await getGameWithPlays(db, id))?.plays[12]?.text).toBe("Corrected overnight");
    expect(await timers()).toEqual([]);
  });

  test("a write to D1 that fails is tried again", async () => {
    const { id, agent, connect, later, timers } = await game();
    espn.set(id, final(id));
    await connect();
    await later(0);
    // The Agent runs in this isolate, so its D1 binding is this one.
    vi.spyOn(env.DB, "batch").mockRejectedValueOnce(new Error("D1 is away"));

    await later(0);
    expect(await gameHasPlays(db, id)).toBe(false);
    expect((await agent.getGame()).archived).toBe(false);
    expect(await timers()).toEqual(["archive"]);
    // Until it is written, the plays are still the Agent's to give.
    expect((await agent.getGame()).plays).toHaveLength(EVERY_PLAY);

    // The next try reads the game again first.
    await later(30);
    expect(await gameHasPlays(db, id)).toBe(true);
    expect((await agent.getGame()).archived).toBe(true);
    expect(espnRequests).toBe(2);
    expect(await timers()).toEqual(["rereadPlays"]);
  });

  test("a final ESPN sends without plays is not archived until it has them", async () => {
    const { id, agent, later } = await game();
    const empty = recorded(id, 0);
    espn.set(id, () => Response.json(empty));

    expect(await agent.ensureArchived()).toBe(false);
    expect((await agent.getGame()).archived).toBe(false);
    expect(await getGameWithPlays(db, id)).toBeNull();

    // The timer set at the first read tries too, and is the one that finds the plays.
    espn.set(id, final(id));
    await later(0);
    await later(30);

    expect((await agent.getGame()).archived).toBe(true);
    expect((await getGameWithPlays(db, id))?.plays).toHaveLength(EVERY_PLAY);
  });
});

describe("a game that is not in progress when someone arrives", () => {
  test("already final: read once, archived, and never polled", async () => {
    const { id, agent, connect, later, timers } = await game();
    espn.set(id, final(id));

    const viewer = await connect();
    await later(0);
    await later(0);

    await vi.waitFor(() => expect(viewer.states().at(-1)?.archived).toBe(true));
    expect(ids(viewer.plays())).toEqual(recordedIds(EVERY_PLAY));
    expect(await timers()).toEqual(["rereadPlays"]);
    expect(espnRequests).toBe(1);

    // A later viewer is given the plays from D1, and ESPN is not asked.
    await viewer.leave();
    const second = await connect();
    await vi.waitFor(() => expect(second.playMessages()).toHaveLength(1));
    expect(ids(second.plays())).toEqual(recordedIds(EVERY_PLAY));
    expect((await agent.getGame()).header?.status).toBe("final");
    expect(await timers()).toEqual(["rereadPlays"]);
    expect(espnRequests).toBe(1);
  });

  test("still to start: the header, no plays, and a poll every 5 minutes", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, scheduled(id, 3));
    const viewer = await connect();
    await later(0);

    await vi.waitFor(() => expect(viewer.states().at(-1)?.header?.status).toBe("scheduled"));
    expect(viewer.plays()).toEqual([]);
    expect((await agent.getGame()).header).toMatchObject({
      home: { abbreviation: "TOR", score: 0, shots: 0 },
      away: { abbreviation: "NSH" },
    });

    await later(IDLE - 1);
    expect(espnRequests).toBe(1);
    await later(1);
    expect(espnRequests).toBe(2);
  });

  test("about to start: a poll every 30 seconds, and the game is picked up when it begins", async () => {
    const { id, connect, later } = await game();
    espn.set(id, scheduled(id, 0.1));
    const viewer = await connect();
    await later(0);

    espn.set(id, live(id, 5));
    await later(INTERMISSION);

    await vi.waitFor(() => expect(viewer.states().at(-1)?.header?.status).toBe("live"));
    expect(ids(viewer.plays())).toEqual(recordedIds(5));
    await later(IN_PLAY);
    expect(espnRequests).toBe(3);
  });

  test("an id ESPN does not know: said so, with no alert and a poll only every 5 minutes", async () => {
    const { id, agent, connect, later } = await game();

    const snapshot = await agent.getGame();
    expect(snapshot).toMatchObject({ header: null, plays: [], notFound: true });

    const viewer = await connect();
    await later(IN_PLAY);
    await later(INTERMISSION);
    await agent.getGame();
    expect(espnRequests).toBe(1);

    await later(IDLE);
    expect(espnRequests).toBe(2);
    expect(pushes).toEqual([]);

    // If ESPN was only late with it, a viewer who stayed sees the game.
    espn.set(id, live(id, 5));
    await later(IDLE);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.header?.status).toBe("live"));
    expect((await agent.getGame()).notFound).toBe(false);
  });
});

describe("the first read of a game nobody has opened", () => {
  /** ESPN's answer for `id`, kept back until `arrive()`. */
  function slow(id: string, answer: () => Response): { arrive: () => void } {
    let arrive = () => {};
    const held = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    espn.set(id, async () => {
      await held;
      return answer();
    });
    return { arrive };
  }

  test("a read that arrives while ESPN is still answering the first waits for that answer", async () => {
    const { id, agent } = await game();
    const espnAnswer = slow(id, scheduled(id, 3));

    const first = agent.getGame();
    await vi.waitFor(() => expect(espnRequests).toBe(1));
    const second = agent.getGame();
    const waiting = new Promise<string>((resolve) => setTimeout(resolve, 250, "still waiting"));
    expect(await Promise.race([second, waiting])).toBe("still waiting");

    espnAnswer.arrive();
    expect((await first).header).toMatchObject({ status: "scheduled", id });
    expect((await second).header).toMatchObject({ status: "scheduled", id });
    expect(espnRequests).toBe(1);
  });

  test("a first read ESPN fails is not remembered: the next read asks again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { id, agent } = await game();
    espn.set(id, espnDown);

    expect(await agent.getGame()).toMatchObject({ header: null, plays: [], notFound: false });

    espn.set(id, scheduled(id, 3));
    expect((await agent.getGame()).header).toMatchObject({ status: "scheduled", id });
    expect(espnRequests).toBe(2);

    // With a header to show, a read inside the interval is answered from what is kept.
    await agent.getGame();
    expect(espnRequests).toBe(2);
  });
});

describe("the Replay's first open of a game nobody watched", () => {
  test("a finished game is read from ESPN once and written to D1, with the re-read set", async () => {
    const { id, agent, timers } = await game();
    espn.set(id, final(id));

    expect(await agent.ensureArchived()).toBe(true);

    const archived = await getGameWithPlays(db, id);
    expect(archived?.game.away.score).toBe(4);
    expect(ids(archived?.plays ?? [])).toEqual(recordedIds(EVERY_PLAY));
    expect(await timers()).toContain("rereadPlays");

    expect(await agent.ensureArchived()).toBe(true);
    expect(espnRequests).toBe(1);
  });

  test("a game still being played is not archived", async () => {
    const { id, agent } = await game();
    espn.set(id, live(id, 50));

    expect(await agent.ensureArchived()).toBe(false);

    expect(await getGameWithPlays(db, id)).toBeNull();
  });

  test("a game seen to end keeps its last poll: an open in that half minute archives nothing", async () => {
    const { id, agent, connect, later } = await game();
    espn.set(id, live(id, 300));
    const viewer = await connect();
    await later(0);
    const early = recorded(id, EVERY_PLAY - 2);
    espn.set(id, () => Response.json(early));
    await later(IN_PLAY);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.header?.status).toBe("final"));

    expect(await agent.ensureArchived()).toBe(false);
    expect(await gameHasPlays(db, id)).toBe(false);

    // The last poll still brings the closing plays, and its write is the archive.
    espn.set(id, final(id));
    await later(LAST_POLL);
    await vi.waitFor(() => expect(viewer.states().at(-1)?.archived).toBe(true));
    expect(ids((await getGameWithPlays(db, id))?.plays ?? [])).toEqual(recordedIds(EVERY_PLAY));
    expect(await agent.ensureArchived()).toBe(true);
  });
});

describe("a restart in the middle of a game", () => {
  /** The game after `plays` plays, in the site's own shape. */
  function summaryAt(id: string, plays: number): GameSummary {
    return translateGameSummary(recorded(id, plays, inProgress), id);
  }

  // Unverified row 15: the gap in polls around a deploy loses no plays.
  test("the first poll afterwards catches up: no play lost and none sent twice", async () => {
    const { id, agent, connect, later, restart } = await game();
    // Up to the restart ESPN is answered inside the Agent: one that has awaited this file's
    // `fetch` cannot be evicted.
    await runInDurableObject(agent, (instance) => {
      // @ts-expect-error `readSummary` is protected: it is the seam for where the game comes from.
      vi.spyOn(instance, "readSummary").mockImplementation(async () => summaryAt(id, 50));
    });
    const viewer = await connect();
    await later(0);
    await vi.waitFor(() => expect(ids(viewer.plays())).toEqual(recordedIds(50)));
    const sentBefore = viewer.playMessages().length;

    await restart();
    // The spy went with the Agent's memory. While it was away ESPN added ten plays and revised one.
    expect(espnRequests).toBe(0);
    espn.set(
      id,
      live(id, 60, (body) => {
        const revised = body.plays[40];
        if (revised) revised.text = "Revised during the deploy";
      }),
    );

    // The timer set before the restart fires, and the viewer is still there to hear of it.
    await later(IN_PLAY);

    expect(espnRequests).toBe(1);
    await vi.waitFor(() => expect(viewer.playMessages()).toHaveLength(sentBefore + 11));
    const sinceRestart = viewer.playMessages().slice(sentBefore);
    expect(sinceRestart.map((message) => message.type).sort()).toEqual([
      ...Array(10).fill("play-added"),
      "play-changed",
    ]);
    const { plays } = await agent.getGame();
    expect(ids(plays)).toEqual(recordedIds(60));
    expect(plays[40]?.text).toBe("Revised during the deploy");
    expect(viewer.plays()).toEqual(plays);

    // And the loop goes on.
    await later(IN_PLAY);
    expect(espnRequests).toBe(2);
  });

  test("first paint straight after a restart is the stored game, without asking ESPN", async () => {
    const { id, agent, connect, later, restart } = await game();
    await runInDurableObject(agent, (instance) => {
      // @ts-expect-error `readSummary` is protected: it is the seam for where the game comes from.
      vi.spyOn(instance, "readSummary").mockImplementation(async () => summaryAt(id, 50));
    });
    await connect();
    await later(0);
    const before = await agent.getGame();

    await restart();

    expect(await agent.getGame()).toEqual(before);
    expect(before.plays).toHaveLength(50);
    expect(espnRequests).toBe(0);
  });
});
