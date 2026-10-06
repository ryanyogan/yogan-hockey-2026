import type { Page, WebSocketRoute } from "@playwright/test";

/*
 * Fixture mode never changes, so a test of the game page plays the two Agents itself, the way
 * `live.spec.ts` plays the Scoreboard. `driveGame` stands between the page and both sockets:
 *
 * - the Scoreboard's messages are passed on and its slate kept, so `scoreboard(change)` can push
 *   the slate again with this one game changed (scheduled to live is what opens the page's
 *   socket to the Game Agent);
 * - the Game Agent's socket never reaches the server. `agent(state, plays)` is the whole of what
 *   the Agent would say: its synced state, and every play so far. It is sent to the page at once
 *   and again to any socket that connects later. `message` sends one stream message as it is.
 *
 * The plays come from the recorded shootout (401803652): `recordedGame` asks that game's real
 * Agent for them over a socket of its own, so they are the Agent's own translation. They are
 * played on the page of the one recorded game that is still scheduled (401892449), with the
 * shootout's two teams renamed to that game's.
 */

export const SCHEDULED_GAME = "401892449";
export const RECORDED_GAME = "401803652";

type Json = Record<string, unknown>;
export type Side = Json & { id: string; score: number; shots: number };
export type Header = Json & { id: string; status: string; home: Side; away: Side };
export type RecordedPlay = Json & {
  id: string;
  type: string;
  period: number;
  teamId: string | null;
};
export type AgentState = { header: Header; delayed: boolean; archived: boolean };

/** What a game's Agent sends a viewer on connect: its state and every play. */
export async function readAgent(
  baseURL: string,
  gameId: string,
): Promise<{ state: AgentState; plays: RecordedPlay[] }> {
  const socket = new WebSocket(`${baseURL.replace(/^http/, "ws")}/agents/game-agent/${gameId}`);
  try {
    return await new Promise((resolve, reject) => {
      let state: AgentState | undefined;
      let plays: RecordedPlay[] | undefined;
      const timer = setTimeout(
        () => reject(new Error(`Game ${gameId}: its Agent said nothing`)),
        30_000,
      );
      socket.addEventListener("error", () => reject(new Error(`Game ${gameId}: no socket`)));
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(String(event.data));
        if (message.type === "cf_agent_state") state = message.state;
        if (message.type === "plays") plays = message.plays;
        if (state?.header != null && plays != null) {
          clearTimeout(timer);
          resolve({ state, plays });
        }
      });
    });
  } finally {
    socket.close();
  }
}

export type RecordedGame = {
  /** The scheduled game's own header, as its page first paints it. */
  scheduled: Header;
  /** The same game in progress after `count` of the recorded plays. */
  liveAfter(count: number, period: number): Header;
  /** The same game over, with the recording's result. */
  final: Header;
  /** The recorded plays, on the scheduled game's teams. */
  plays: RecordedPlay[];
};

/** The recorded shootout as a game between the scheduled game's teams. */
export async function recordedGame(baseURL: string): Promise<RecordedGame> {
  const scheduled = (await readAgent(baseURL, SCHEDULED_GAME)).state.header;
  const recorded = await readAgent(baseURL, RECORDED_GAME);
  const was = recorded.state.header;
  const renamed = new Map([
    [was.home.id, scheduled.home.id],
    [was.away.id, scheduled.away.id],
  ]);
  const plays = recorded.plays.map((play) => ({
    ...play,
    teamId: play.teamId == null ? null : (renamed.get(play.teamId) ?? play.teamId),
  }));
  const side = (to: Side, from: Side, winner = false): Side => ({
    ...to,
    score: from.score,
    shots: from.shots,
    winner,
  });
  return {
    scheduled,
    plays,
    liveAfter(count, period) {
      const last = plays[count - 1] as Json | undefined;
      const shots = (teamId: string) =>
        plays
          .slice(0, count)
          .filter((play) => play.teamId === teamId && /shot|goal/.test(play.type)).length;
      return {
        ...scheduled,
        status: "live",
        period,
        // As in every recorded summary: the header has no clock of its own.
        clock: "0:00",
        detail: "In Progress",
        home: {
          ...scheduled.home,
          score: Number(last?.homeScore ?? 0),
          shots: shots(scheduled.home.id),
        },
        away: {
          ...scheduled.away,
          score: Number(last?.awayScore ?? 0),
          shots: shots(scheduled.away.id),
        },
      };
    },
    final: {
      ...scheduled,
      status: "final",
      period: was.period,
      clock: "0:00",
      detail: was.detail,
      home: side(scheduled.home, was.home, was.home.winner === true),
      away: side(scheduled.away, was.away, was.away.winner === true),
    },
  };
}

export type GameDriver = {
  /** How many sockets the page has opened to the Game Agent. */
  agentSockets(): number;
  /** Pushes the Scoreboard's slate with this game changed; `scores` takes each side's from a header. */
  scoreboard(change: Json & { scores?: Header }): Promise<void>;
  /** The Game Agent's state and every play so far, to the page now and to later sockets. */
  agent(state: AgentState, plays: RecordedPlay[]): void;
  /** One message as the Game Agent, such as a `play-added`. */
  message(message: Json): void;
};

export async function driveGame(page: Page, gameId: string): Promise<GameDriver> {
  let slate: (Json & { games: Json[] }) | undefined;
  let toScoreboard: WebSocketRoute | undefined;
  await page.routeWebSocket(/\/agents\/scoreboard-agent\/main/, (socket) => {
    const server = socket.connectToServer();
    server.onMessage((message) => {
      const parsed = JSON.parse(String(message));
      if (parsed.type === "cf_agent_state") slate = parsed.state;
      socket.send(message);
    });
    toScoreboard = socket;
  });

  const sockets: WebSocketRoute[] = [];
  let said: string[] = [];
  await page.routeWebSocket(new RegExp(`/agents/game-agent/${gameId}`), (socket) => {
    sockets.push(socket);
    for (const message of said) socket.send(message);
  });
  const say = (messages: Json[]) => {
    const texts = messages.map((message) => JSON.stringify(message));
    for (const socket of sockets) for (const text of texts) socket.send(text);
    return texts;
  };

  return {
    agentSockets: () => sockets.length,
    async scoreboard({ scores, ...change }) {
      const deadline = Date.now() + 30_000;
      while (slate == null || toScoreboard == null) {
        if (Date.now() > deadline) throw new Error("The Scoreboard's socket delivered no slate");
        await page.waitForTimeout(100);
      }
      slate = {
        ...slate,
        games: slate.games.map((game) => {
          if (game.id !== gameId) return game;
          const side = (name: "home" | "away") =>
            scores == null
              ? game[name]
              : { ...(game[name] as Json), score: scores[name].score, winner: scores[name].winner };
          return { ...game, ...change, home: side("home"), away: side("away") };
        }),
      };
      toScoreboard.send(JSON.stringify({ type: "cf_agent_state", state: slate }));
    },
    agent(state, plays) {
      said = say([
        { type: "cf_agent_state", state },
        { type: "plays", plays },
      ]);
    },
    message(message) {
      say([message]);
    },
  };
}
