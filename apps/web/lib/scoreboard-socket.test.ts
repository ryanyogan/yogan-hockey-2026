import type { ScoreboardState } from "@yogan-hockey/schemas";
import { PartySocket } from "partysocket";
import { describe, expect, it } from "vitest";
import {
  followScoreboard,
  type ScoreboardSocket,
  scoreboardSocketOptions,
} from "./scoreboard-socket";

const STATE: ScoreboardState = {
  date: "2026-10-03",
  games: [],
  updatedAt: "2026-10-03T23:00:00.000Z",
  invalidatedAt: null,
};

/** A socket the test plays the Agent on. */
class FakeSocket extends EventTarget implements ScoreboardSocket {
  closed = false;
  sent: unknown[] = [];
  send(data: unknown) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
    // As PartySocket does: closing a socket says so to whoever still listens.
    this.dispatchEvent(new Event("close"));
  }
  says(data: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}

const follow = () => {
  const socket = new FakeSocket();
  const heard: unknown[] = [];
  let options: unknown;
  const stop = followScoreboard(
    "hockey.example",
    {
      onOpen: () => void heard.push("open"),
      onClose: () => void heard.push("close"),
      onState: (state) => void heard.push(["state", state]),
      onMessage: (data) => void heard.push(["message", data]),
    },
    (given) => {
      options = given;
      return socket;
    },
  );
  return { socket, heard, stop, options: () => options };
};

describe("where the Scoreboard's socket goes", () => {
  it("is the address the Agent is served at, as `useAgent` made it", () => {
    const socket = new PartySocket({
      ...scoreboardSocketOptions("hockey.example"),
      startClosed: true,
    });
    expect(socket.roomUrl).toBe("wss://hockey.example/agents/scoreboard-agent/main");
    socket.close();
  });

  it("is an insecure socket to a dev server on this machine", () => {
    const socket = new PartySocket({
      ...scoreboardSocketOptions("localhost:5173"),
      startClosed: true,
    });
    expect(socket.roomUrl).toBe("ws://localhost:5173/agents/scoreboard-agent/main");
    socket.close();
  });

  it("comes back after any close but one that says not to", () => {
    const { shouldReconnectOnClose } = scoreboardSocketOptions("hockey.example");
    const closedWith = (code: number) => shouldReconnectOnClose(new CloseEvent("close", { code }));
    expect(closedWith(1006)).toBe(true);
    expect(closedWith(1001)).toBe(true);
    expect(closedWith(1008)).toBe(false);
    expect(closedWith(4000)).toBe(false);
    expect(closedWith(4999)).toBe(false);
    expect(closedWith(5000)).toBe(true);
  });
});

describe("following the Scoreboard", () => {
  it("connects with the Scoreboard's options and sends nothing", () => {
    const { socket, options } = follow();
    socket.dispatchEvent(new Event("open"));
    expect(options()).toMatchObject({
      host: "hockey.example",
      party: "scoreboard-agent",
      prefix: "agents",
      room: "main",
    });
    expect(socket.sent).toEqual([]);
  });

  it("hands on the Agent's state", () => {
    const { socket, heard } = follow();
    socket.says(JSON.stringify({ type: "cf_agent_state", state: STATE }));
    expect(heard).toEqual([["state", STATE]]);
  });

  it("hands on any other message as it came", () => {
    const { socket, heard } = follow();
    const word = JSON.stringify({ type: "scoreboard_heard", at: "2026-10-03T23:05:00.000Z" });
    socket.says(word);
    socket.says("not json");
    socket.says(JSON.stringify({ type: "cf_agent_state" }));
    expect(heard).toEqual([
      ["message", word],
      ["message", "not json"],
      ["message", JSON.stringify({ type: "cf_agent_state" })],
    ]);
  });

  it("says when the socket opens and each time it closes", () => {
    const { socket, heard } = follow();
    socket.dispatchEvent(new Event("open"));
    socket.dispatchEvent(new Event("close"));
    socket.dispatchEvent(new Event("close"));
    socket.dispatchEvent(new Event("open"));
    expect(heard).toEqual(["open", "close", "close", "open"]);
  });

  it("closes the socket when stopped, and reports nothing after", () => {
    const { socket, heard, stop } = follow();
    stop();
    expect(socket.closed).toBe(true);
    socket.dispatchEvent(new Event("open"));
    socket.says(JSON.stringify({ type: "cf_agent_state", state: STATE }));
    expect(heard).toEqual([]);
  });
});
