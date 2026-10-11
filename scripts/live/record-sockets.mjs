/**
 * Holds the sockets a viewer's pages hold through live games, for the live game verification
 * (#54): one to each game's Game Agent and one to the Scoreboard, on the deployed site.
 *
 *   node scripts/live/record-sockets.mjs <outDir> <hours> <gameId> [gameId...]
 *   ORIGIN=wss://hockey.yogan.dev (the default)
 *
 * An open socket is what makes an Agent poll ESPN, so this is also what puts the Agents to work.
 * It only ever reads: the Agents refuse a browser's writes. Every frame is written whole with its
 * arrival time, one JSON line each, in `<outDir>/sockets.jsonl`. A socket that closes is opened
 * again after two seconds, and the gap is on record as a `close` and an `open` line.
 * A heartbeat line goes to stdout every 5 minutes. Stops after `hours`, or 50 minutes after every
 * game's Agent has said it is archived.
 */
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [outDir, hours = "6", ...gameIds] = process.argv.slice(2);
if (!outDir || gameIds.length === 0) {
  console.error("usage: record-sockets.mjs <outDir> <hours> <gameId> [gameId...]");
  process.exit(1);
}
const origin = process.env.ORIGIN ?? "wss://hockey.yogan.dev";
mkdirSync(outDir, { recursive: true });
const file = `${outDir}/sockets.jsonl`;
const write = (line) =>
  appendFileSync(file, `${JSON.stringify({ t: new Date().toISOString(), ...line })}\n`);

const started = Date.now();
const deadline = started + Number(hours) * 3600_000;
const archivedAt = new Map();
const frames = new Map();
const over = () =>
  Date.now() > deadline ||
  gameIds.every((id) => archivedAt.has(id) && Date.now() - archivedAt.get(id) > 50 * 60_000);

/** One socket, kept open until the recording is over. `name` is how its lines are told apart. */
async function hold(name, path) {
  while (!over()) {
    await new Promise((resolve) => {
      // The Agents SDK's client names each connection with `_pk`; the page does the same.
      const socket = new WebSocket(`${origin}${path}?_pk=${randomUUID()}`);
      const stop = setInterval(() => over() && socket.close(), 5000);
      socket.addEventListener("open", () => write({ socket: name, kind: "open" }));
      socket.addEventListener("message", (event) => {
        const data =
          typeof event.data === "string" ? event.data : `<binary ${event.data.byteLength ?? "?"}>`;
        frames.set(name, (frames.get(name) ?? 0) + 1);
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {}
        write({ socket: name, kind: "frame", bytes: data.length, data: parsed ?? data });
        if (parsed?.type === "cf_agent_state" && parsed.state?.archived && !archivedAt.has(name)) {
          archivedAt.set(name, Date.now());
        }
      });
      socket.addEventListener("error", (event) =>
        write({ socket: name, kind: "error", error: String(event.message ?? event.type) }),
      );
      socket.addEventListener("close", (event) => {
        clearInterval(stop);
        write({ socket: name, kind: "close", code: event.code, reason: event.reason });
        resolve();
      });
    });
    if (!over()) await sleep(2000);
  }
}

write({ kind: "start", origin, gameIds, hours: Number(hours) });
console.log(`holding sockets to ${origin} for ${gameIds.join(", ")}, writing ${file}`);
const beat = setInterval(() => {
  console.log(
    `${new Date().toISOString()} heartbeat frames=${JSON.stringify(Object.fromEntries(frames))} archived=${[...archivedAt.keys()].join(",")}`,
  );
}, 5 * 60_000);
await Promise.all([
  hold("scoreboard", "/agents/scoreboard-agent/main"),
  ...gameIds.map((id) => hold(id, `/agents/game-agent/${id}`)),
]);
clearInterval(beat);
write({ kind: "end" });
console.log("done");
