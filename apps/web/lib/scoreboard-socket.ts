import type { ScoreboardState } from "@yogan-hockey/schemas";
import { PartySocket } from "partysocket";
import { SCOREBOARD_CONNECTION } from "./scoreboard-connection";

/** What a page is told of its Scoreboard socket. */
export type ScoreboardFollower = {
  /** The socket opened, the first time or again after a drop. */
  onOpen: () => void;
  /** The socket closed, or an attempt to open it failed. */
  onClose: () => void;
  /** The Agent's state: on connecting, and whenever a poll finds something different. */
  onState: (state: ScoreboardState) => void;
  /** Anything else on the socket, as it came (`heardAtFrom` reads the one the page wants). */
  onMessage: (data: unknown) => void;
};

/** The part of a socket this file uses, so a test can stand in for it. */
export type ScoreboardSocket = Pick<EventTarget, "addEventListener" | "removeEventListener"> & {
  close: () => void;
};

/** The Agents SDK's own rule: a policy violation or an application's close code is final. */
const isFinalClose = (event: { code: number }) =>
  event.code === 1008 || (event.code >= 4000 && event.code <= 4999);

/**
 * How to reach the Scoreboard Agent from a page on `host`: the address `routeAgentRequest`
 * serves (`/agents/scoreboard-agent/main`), with PartySocket's `_pk` in the query as `useAgent`
 * sends it.
 */
export function scoreboardSocketOptions(host: string) {
  return {
    host,
    prefix: "agents",
    party: SCOREBOARD_CONNECTION.agent,
    room: SCOREBOARD_CONNECTION.name,
    shouldReconnectOnClose: (event: { code: number }) => !isFinalClose(event),
  };
}

type AgentMessage = { type?: unknown; state?: unknown };

/** The state in one of the Agents SDK's `cf_agent_state` messages; null for any other message. */
function stateFrom(data: unknown): ScoreboardState | null {
  if (typeof data !== "string") return null;
  try {
    const message: AgentMessage | null = JSON.parse(data);
    if (message?.type !== "cf_agent_state" || message.state == null) return null;
    return message.state as ScoreboardState;
  } catch {
    return null;
  }
}

/**
 * Opens the page's socket to the Scoreboard Agent and reports what arrives on it, until the
 * returned function is called. The socket is a PartySocket, which is what `useAgent` opens too,
 * so it comes back by itself after a drop (and says `onClose` for every failed attempt); this
 * takes `useAgent`'s place because the page only listens: it sets no state and calls nothing,
 * and `agents/react` is 24 kB of every route's script. Nothing is ever sent.
 */
export function followScoreboard(
  host: string,
  follower: ScoreboardFollower,
  connect: (options: ReturnType<typeof scoreboardSocketOptions>) => ScoreboardSocket = (options) =>
    new PartySocket(options),
): () => void {
  const socket = connect(scoreboardSocketOptions(host));
  const opened = () => follower.onOpen();
  const closed = () => follower.onClose();
  const said = (event: Event) => {
    const { data } = event as MessageEvent<unknown>;
    const state = stateFrom(data);
    if (state == null) follower.onMessage(data);
    else follower.onState(state);
  };
  socket.addEventListener("open", opened);
  socket.addEventListener("close", closed);
  socket.addEventListener("message", said);
  return () => {
    // Stop listening first: closing a socket is itself a close, and nobody is left to tell.
    socket.removeEventListener("open", opened);
    socket.removeEventListener("close", closed);
    socket.removeEventListener("message", said);
    socket.close();
  };
}
