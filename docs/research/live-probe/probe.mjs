// Live probe of ESPN's summary endpoint for issue #16. Waits for the game to go live,
// then polls every 10 s for LIVE_MINUTES, logging new, changed and removed plays as JSON lines.
import { appendFileSync } from "node:fs";
import { execSync } from "node:child_process";

const EVENT = process.argv[2];
const LIVE_MINUTES = Number(process.argv[3] ?? 50);
const B = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl";
const OUT = new URL(`./probe-${EVENT}.jsonl`, import.meta.url).pathname;
const log = (o) => appendFileSync(OUT, JSON.stringify({ t: new Date().toISOString(), ...o }) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (p) => ({ seq: p.sequenceNumber, type: p.type?.text, text: p.text, period: p.period?.number, clock: p.clock?.displayValue, coord: p.coordinate ?? null, modified: p.modified, wallclock: p.wallclock });

const board = async () => {
  const j = await (await fetch(`${B}/scoreboard`)).json();
  const e = j.events.find((e) => e.id === EVENT);
  const c = e?.competitions?.[0];
  return { state: e?.status?.type?.state, name: e?.status?.type?.name, period: e?.status?.period, clock: e?.status?.displayClock, score: c?.competitors?.map((x) => `${x.team.abbreviation} ${x.score}`).join(", ") };
};

log({ ev: "start", EVENT, LIVE_MINUTES });
for (; !process.env.SKIP_WAIT;) {
  const b = await board().catch((e) => ({ err: String(e) }));
  if (b.state === "in") break;
  if (b.state === "post") { log({ ev: "already-final" }); process.exit(0); }
  await sleep(30_000);
}
log({ ev: "live" });

const seen = new Map();
const end = Date.now() + LIVE_MINUTES * 60_000;
let n = 0;
while (Date.now() < end) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${B}/summary?event=${EVENT}`);
    const j = await res.json();
    const st = j.header?.competitions?.[0]?.status;
    const plays = j.plays ?? [];
    const ids = new Set(plays.map((p) => p.id));
    const added = [], changed = [], removed = [];
    for (const p of plays) {
      const cur = pick(p), prev = seen.get(p.id);
      if (!prev) { added.push({ id: p.id, ...cur, lagSec: cur.wallclock ? Math.round((t0 - Date.parse(cur.wallclock)) / 1000) : null }); }
      else if (JSON.stringify(prev) !== JSON.stringify(cur)) { changed.push({ id: p.id, from: prev, to: cur }); }
      seen.set(p.id, cur);
    }
    for (const id of seen.keys()) if (!ids.has(id)) { removed.push({ id, was: seen.get(id) }); seen.delete(id); }
    const sb = n % 3 === 0 ? await board().catch(() => null) : undefined;
    let gz;
    if (n % 30 === 0) gz = Number(execSync(`curl -s --compressed -o /dev/null -w '%{size_download}' '${B}/summary?event=${EVENT}'`).toString());
    log({ ev: "poll", n, ms: Date.now() - t0, cache: res.headers.get("cache-control"), age: res.headers.get("age"), status: { name: st?.type?.name, state: st?.type?.state, detail: st?.type?.detail, period: st?.period, clock: st?.displayClock }, total: plays.length, first: n === 0, added: n === 0 ? added.length : added, changed, removed, scoreboard: sb, gz });
    if (st?.type?.state === "post" && n > 0) { log({ ev: "final" }); break; }
  } catch (e) { log({ ev: "error", err: String(e) }); }
  n++;
  await sleep(Math.max(0, 10_000 - (Date.now() - t0)));
}
log({ ev: "done", polls: n });
