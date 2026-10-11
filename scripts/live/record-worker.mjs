/**
 * Samples the deployed Worker's own logs through a live game, for the live game verification (#54).
 *
 *   node scripts/live/record-worker.mjs <outDir> <hours> [everySeconds=120] [origin]
 *
 * Every two minutes it reads the last five minutes with `scripts/worker-logs.sh` (`RAW=1`) and
 * writes each event it has not written before to `<outDir>/worker.jsonl`: time, what ran, outcome,
 * wall and CPU milliseconds, the version that ran it, and any message or error. It also asks the
 * site for a page once a minute and writes a line when the build's stylesheet name changes, which
 * is how a deploy in the middle of the game shows.
 */
import { execFile } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const [outDir, hours = "6", every = "120", origin = "https://hockey.yogan.dev"] =
  process.argv.slice(2);
if (!outDir) {
  console.error("usage: record-worker.mjs <outDir> <hours> [everySeconds] [origin]");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const file = `${outDir}/worker.jsonl`;
const write = (line) => appendFileSync(file, `${JSON.stringify(line)}\n`);
const script = new URL("../worker-logs.sh", import.meta.url).pathname;
const seen = new Set();

async function sample() {
  try {
    const { stdout } = await run("bash", [script, "5", "2000"], {
      env: { ...process.env, RAW: "1" },
      maxBuffer: 256 * 1024 * 1024,
      timeout: 90_000,
    });
    const answer = JSON.parse(stdout);
    const events = (answer.result ?? answer).events?.events ?? [];
    let fresh = 0;
    for (const event of events.reverse()) {
      const meta = event.$metadata ?? {};
      const worker = event.$workers ?? {};
      const key = meta.id ?? `${event.timestamp}:${meta.requestId}:${meta.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fresh++;
      write({
        kind: "event",
        t: new Date(event.timestamp).toISOString(),
        type: worker.eventType,
        entrypoint: worker.entrypoint,
        what: meta.trigger ?? meta.message,
        message: meta.message,
        level: meta.level,
        outcome: worker.outcome,
        wall: worker.wallTimeMs,
        cpu: worker.cpuTimeMs,
        version: worker.scriptVersion?.id,
        tag: worker.scriptVersion?.tag,
        error: meta.error,
        request: meta.requestId,
        durableObject: worker.durableObjectId,
      });
    }
    write({ kind: "sample", t: new Date().toISOString(), returned: events.length, fresh });
  } catch (error) {
    write({
      kind: "sample-failed",
      t: new Date().toISOString(),
      error: String(error).slice(0, 500),
    });
  }
}

let build = null;
async function version() {
  try {
    const response = await fetch(`${origin}/nhl/live`, {
      method: "HEAD",
      signal: AbortSignal.timeout(20_000),
    });
    const now = /static\/css\/([^>]+)>/.exec(response.headers.get("link") ?? "")?.[1] ?? null;
    if (now !== build)
      write({
        kind: "build",
        t: new Date().toISOString(),
        from: build,
        to: now,
        status: response.status,
      });
    build = now;
  } catch (error) {
    write({
      kind: "build-failed",
      t: new Date().toISOString(),
      error: String(error).slice(0, 300),
    });
  }
}

const started = Date.now();
const deadline = started + Number(hours) * 3600_000;
write({ kind: "start", t: new Date().toISOString() });
console.log(`sampling the Worker's logs into ${file}`);
for (let minute = 0; Date.now() < deadline; minute++) {
  await version();
  if ((minute * 60) % Number(every) === 0) await sample();
  const wait = started + (minute + 1) * 60_000 - Date.now();
  if (wait > 0) await sleep(wait);
}
write({ kind: "end", t: new Date().toISOString() });
console.log("done");
