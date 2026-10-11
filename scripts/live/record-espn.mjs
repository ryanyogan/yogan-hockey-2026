/**
 * Records what ESPN says about live games, for the live game verification (#54).
 *
 *   node scripts/live/record-espn.mjs <outDir> <hours> <gameId> [spareGameId...]
 *
 * Every 10 seconds, the scoreboard and each game's summary (the Game Agent's own cadence, and the
 * earlier probe's); a game more than 10 minutes from its start, or more than 10 minutes past its
 * final, is asked about once a minute. The standings every 5 minutes, and every 30 seconds from
 * the first final on. One JSON line per poll in `<outDir>/espn.jsonl`. A summary line keeps the
 * header's status whole, the score and, when the order changed, each play's id and a hash of its
 * content; a play is written whole (`kind: "play"`) only when it is new or its content changed.
 * Every summary is also kept whole, gzipped, in `<outDir>/raw/<gameId>/<time>.json.gz`, so a
 * fixture can be cut from it afterwards. A heartbeat line goes to stdout every 5 minutes.
 * Stops `hours` after it starts, or 65 minutes after every game is final.
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { gzipSync } from "node:zlib";

const [outDir, hours = "6", ...gameIds] = process.argv.slice(2);
if (!outDir || gameIds.length === 0) {
  console.error("usage: record-espn.mjs <outDir> <hours> <gameId> [spareGameId...]");
  process.exit(1);
}

const SITE = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl";
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings?level=3";
const file = `${outDir}/espn.jsonl`;
mkdirSync(outDir, { recursive: true });
for (const id of gameIds) mkdirSync(`${outDir}/raw/${id}`, { recursive: true });

const write = (line) => appendFileSync(file, `${JSON.stringify(line)}\n`);
const hash = (value) => createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 10);
const stamp = (at) => new Date(at).toISOString();

async function get(url) {
  const sent = Date.now();
  // The plain URL, as the site asks for it.
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(9000),
  });
  const text = await response.text();
  const got = Date.now();
  const h = response.headers;
  return {
    sent,
    got,
    status: response.status,
    text,
    http: {
      date: h.get("date"),
      age: h.get("age"),
      cache: h.get("cache-control"),
      modified: h.get("last-modified"),
      etag: h.get("etag"),
    },
  };
}

function statusOf(status) {
  return {
    name: status?.type?.name,
    state: status?.type?.state,
    completed: status?.type?.completed,
    description: status?.type?.description,
    detail: status?.type?.detail,
    shortDetail: status?.type?.shortDetail,
    displayClock: status?.displayClock,
    clock: status?.clock,
    period: status?.period,
  };
}

const known = new Map(gameIds.map((id) => [id, { plays: new Map(), order: "" }]));
const finalAt = new Map();
/** Each game's state and start as last seen, which is what sets how often it is asked about. */
const lastSeen = new Map();
const counts = { summary: 0, scoreboard: 0, standings: 0, errors: 0 };

async function pollSummary(id) {
  const base = { kind: "summary", id };
  try {
    const answer = await get(`${SITE}/summary?event=${id}`);
    const line = {
      ...base,
      t: stamp(answer.got),
      ms: answer.got - answer.sent,
      status: answer.status,
      http: answer.http,
    };
    if (answer.status !== 200) return write(line);
    const summary = JSON.parse(answer.text);
    writeFileSync(
      `${outDir}/raw/${id}/${stamp(answer.got).replace(/[:.]/g, "-")}.json.gz`,
      gzipSync(answer.text),
    );
    const competition = summary.header?.competitions?.[0];
    const plays = summary.plays ?? [];
    const memory = known.get(id);
    const seen = new Set();
    plays.forEach((play, index) => {
      const digest = hash(play);
      seen.add(play.id);
      const before = memory.plays.get(play.id);
      if (before !== digest) {
        write({
          kind: "play",
          id,
          t: line.t,
          playId: play.id,
          index,
          change: before ? "changed" : "new",
          play,
        });
        memory.plays.set(play.id, digest);
      }
    });
    const removed = [...memory.plays.keys()].filter((playId) => !seen.has(playId));
    for (const playId of removed) {
      write({ kind: "play-removed", id, t: line.t, playId });
      memory.plays.delete(playId);
    }
    const order = plays.map((play) => `${play.id}:${memory.plays.get(play.id)}`);
    const orderKey = order.join(",");
    line.bytes = answer.text.length;
    line.header = statusOf(competition?.status);
    line.rawStatus = competition?.status ?? null;
    line.shots = (summary.boxscore?.teams ?? []).map((side) => [
      side.team?.abbreviation,
      side.statistics?.find((stat) => stat.name === "shotsTotal")?.displayValue ?? null,
    ]);
    lastSeen.set(id, {
      state: competition?.status?.type?.state,
      start: Date.parse(competition?.date ?? ""),
    });
    counts.summary++;
    line.score = (competition?.competitors ?? []).map((side) => [
      side.homeAway,
      side.team?.abbreviation,
      side.score,
      side.linescores?.length ?? null,
    ]);
    line.count = plays.length;
    const last = plays.at(-1);
    line.last = last
      ? {
          id: last.id,
          type: last.type?.text,
          period: last.period?.number,
          clock: last.clock?.displayValue,
          wallclock: last.wallclock,
          away: last.awayScore,
          home: last.homeScore,
        }
      : null;
    // The ordered ids and hashes, only when they differ from the poll before.
    if (orderKey !== memory.order) line.order = order;
    memory.order = orderKey;
    write(line);
    if (competition?.status?.type?.completed && !finalAt.has(id)) finalAt.set(id, answer.got);
  } catch (error) {
    counts.errors++;
    write({ ...base, t: stamp(Date.now()), error: String(error) });
  }
}

async function pollScoreboard() {
  try {
    const answer = await get(`${SITE}/scoreboard`);
    const line = {
      kind: "scoreboard",
      t: stamp(answer.got),
      ms: answer.got - answer.sent,
      status: answer.status,
      http: answer.http,
    };
    if (answer.status === 200) {
      const board = JSON.parse(answer.text);
      counts.scoreboard++;
      line.day = board.day?.date;
      line.events = (board.events ?? []).map((event) => {
        const competition = event.competitions?.[0];
        return {
          id: event.id,
          ...statusOf(competition?.status ?? event.status),
          score: (competition?.competitors ?? []).map((side) => [
            side.homeAway,
            side.team?.abbreviation,
            side.score,
            side.records?.[0]?.summary ?? null,
          ]),
        };
      });
    }
    write(line);
  } catch (error) {
    write({ kind: "scoreboard", t: stamp(Date.now()), error: String(error) });
  }
}

let standingsKey = "";
async function pollStandings() {
  try {
    const answer = await get(STANDINGS);
    const line = {
      kind: "standings",
      t: stamp(answer.got),
      ms: answer.got - answer.sent,
      status: answer.status,
      http: answer.http,
    };
    if (answer.status === 200) {
      counts.standings++;
      const rows = [];
      const walk = (node) => {
        for (const entry of node.standings?.entries ?? []) {
          const stat = (name) =>
            entry.stats?.find((item) => item.name === name || item.type === name)?.value ?? null;
          rows.push([
            entry.team?.abbreviation,
            stat("gamesPlayed"),
            stat("wins"),
            stat("losses"),
            stat("otLosses"),
            stat("points"),
          ]);
        }
        for (const child of node.children ?? []) walk(child);
      };
      walk(JSON.parse(answer.text));
      rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      line.hash = hash(rows);
      line.bodyHash = createHash("sha1").update(answer.text).digest("hex").slice(0, 10);
      if (line.hash !== standingsKey) line.rows = rows;
      standingsKey = line.hash;
    }
    write(line);
  } catch (error) {
    write({ kind: "standings", t: stamp(Date.now()), error: String(error) });
  }
}

const started = Date.now();
const deadline = started + Number(hours) * 3600_000;
write({ kind: "start", t: stamp(started), gameIds, hours: Number(hours) });
console.log(`recording ${gameIds.join(", ")} to ${file}`);

for (let tick = 0; ; tick++) {
  const at = started + tick * 10_000;
  const wait = at - Date.now();
  if (wait > 0) await sleep(wait);
  const now = Date.now();
  if (now > deadline) break;
  if (gameIds.every((id) => finalAt.has(id) && now - finalAt.get(id) > 65 * 60_000)) break;
  const work = [];
  for (const id of gameIds) {
    const seen = lastSeen.get(id);
    const farOff = seen?.state === "pre" && seen.start - now > 10 * 60_000;
    const done = finalAt.has(id) && now - finalAt.get(id) > 10 * 60_000;
    if (!(farOff || done) || tick % 6 === 0) work.push(pollSummary(id));
  }
  work.push(pollScoreboard());
  if (tick % (finalAt.size > 0 ? 3 : 30) === 0) work.push(pollStandings());
  await Promise.all(work);
  if (tick % 30 === 0) {
    const states = gameIds.map(
      (id) =>
        `${id}:${finalAt.has(id) ? "final" : (lastSeen.get(id)?.state ?? "?")}:${known.get(id).plays.size}`,
    );
    console.log(`${stamp(Date.now())} heartbeat ${JSON.stringify(counts)} ${states.join(" ")}`);
  }
}
write({
  kind: "end",
  t: stamp(Date.now()),
  finalAt: Object.fromEntries([...finalAt].map(([id, at]) => [id, stamp(at)])),
});
console.log("done");
