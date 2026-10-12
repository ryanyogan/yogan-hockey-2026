// What each page costs the Worker and how much HTML it sends, with no browser and no throttling:
// the time to the answer's headers, to its last byte, and the document's size, on two sites asked
// in turn. For what the port moved onto the server (a team's page reading the Scoreboard and its
// picks, Home's two reads, a player's whole game log in the page).
//
//   node scripts/performance/server-time.ts <main's site> <the branch's site>
//        [--n=30] [--colds=3] [--cold='<command that restarts the branch with KV emptied>']
//
// Ask the previews themselves (the inner ports of scripts/performance/serve-build.sh), not the
// compressing proxy. Each page is asked `n` times of each site in turn: `main` from its page
// cache, `main` rendered (`?uncached=<n>`), the branch (its ESPN reads in KV after the first two
// asks, which are not counted). With `--cold`, the command is run before each of `colds` further
// asks of the branch, then one page that reads nothing from ESPN is rendered, so the ask that is
// timed meets an empty KV and a Worker that has rendered before.
//
// A fixture build reads recordings, not ESPN: a cold read here costs the Worker's own work and
// two KV operations, and nothing of ESPN's latency, which is most of a cold read in production.
import { execSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { printed, spread } from "./compare.ts";
import { FIXTURE_SUBJECTS, measuredRoutes } from "./routes.ts";

const args = process.argv.slice(2);
const [main, branch] = args.filter((arg) => !arg.startsWith("--"));
const flag = (name: string, otherwise: string) =>
  args.findLast((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? otherwise;
const n = Number(flag("n", "30"));
const colds = Number(flag("colds", "3"));
const cold = flag("cold", "");
if (!main || !branch) {
  console.error(
    "usage: server-time.ts <main's site> <the branch's site> [--n=30] [--cold=<command>]",
  );
  process.exit(1);
}

type Ask = {
  headersMs: number;
  totalMs: number;
  bytes: number;
  gzipBytes: number;
  status: number;
  cache: string | null;
};

async function ask(base: string, path: string): Promise<Ask> {
  const from = performance.now();
  const answer = await fetch(base + path, { redirect: "manual" });
  const headersMs = performance.now() - from;
  const body = Buffer.from(await answer.arrayBuffer());
  return {
    headersMs,
    totalMs: performance.now() - from,
    bytes: body.length,
    gzipBytes: gzipSync(body, { level: 9 }).length,
    status: answer.status,
    cache: answer.headers.get("x-page-cache"),
  };
}

const uncached = (path: string, count: number) =>
  `${path}${path.includes("?") ? "&" : "?"}uncached=${count}`;
const kb = (bytes: number) => (bytes / 1024).toFixed(1);
const rows: string[] = [];
const statuses: string[] = [];

for (const route of measuredRoutes(FIXTURE_SUBJECTS)) {
  const samples: Record<string, Ask[]> = { cached: [], rendered: [], warm: [], cold: [] };
  // Not counted: the asks that fill main's page cache and the branch's KV.
  for (let warming = 0; warming < 2; warming++) {
    await ask(main, route.path);
    await ask(branch, route.path);
  }
  for (let count = 1; count <= n; count++) {
    if (route.cacheable) samples.cached?.push(await ask(main, route.path));
    samples.rendered?.push(
      await ask(main, route.cacheable ? uncached(route.path, count) : route.path),
    );
    samples.warm?.push(await ask(branch, route.path));
  }
  if (cold !== "") {
    for (let count = 0; count < colds; count++) {
      execSync(cold, { stdio: "ignore" });
      await ask(branch, "/no-such-page");
      samples.cold?.push(await ask(branch, route.path));
    }
  }
  const time = (of: Ask[] | undefined, pick: (one: Ask) => number) =>
    of == null || of.length === 0 ? "" : printed(spread(of.map(pick)), 1);
  const size = (of: Ask[] | undefined) => {
    const last = of?.at(-1);
    return last == null ? "" : `${kb(last.bytes)} (${kb(last.gzipBytes)})`;
  };
  rows.push(
    `| ${[
      `\`${route.path}\``,
      time(samples.cached, (one) => one.headersMs),
      time(samples.rendered, (one) => one.headersMs),
      time(samples.warm, (one) => one.headersMs),
      time(samples.cold, (one) => one.headersMs),
      time(samples.cached, (one) => one.totalMs),
      time(samples.rendered, (one) => one.totalMs),
      time(samples.warm, (one) => one.totalMs),
      time(samples.cold, (one) => one.totalMs),
      size(samples.rendered),
      size(samples.warm),
    ].join(" | ")} |`,
  );
  // What each condition really was: a "cached" ask the cache did not answer is said.
  const seen = (of: Ask[] | undefined) =>
    [...new Set((of ?? []).map((one) => `${one.status}${one.cache ? ` ${one.cache}` : ""}`))].join(
      ", ",
    );
  statuses.push(
    `- \`${route.path}\`: main cached ${seen(samples.cached) || "not kept"}; main rendered ${seen(samples.rendered)}; branch ${seen(samples.warm)}${cold === "" ? "" : `; branch cold ${seen(samples.cold)}`}`,
  );
  console.error(`${route.path} done`);
}

console.log(
  [
    `Asked of \`main\` at ${main} and the branch at ${branch}, in turn, ${n} times a page${cold === "" ? ", KV never emptied" : ` (${colds} more with KV emptied)`}, no throttling, ${new Date().toISOString()}. Milliseconds: the median, with the least and the greatest in brackets. Size: kB, gzipped in brackets.`,
    "",
    "| Page | Headers: `main` cached | Headers: `main` rendered | Headers: branch, KV warm | Headers: branch, KV cold | Whole answer: `main` cached | Whole answer: `main` rendered | Whole answer: branch, KV warm | Whole answer: branch, KV cold | Document: `main` | Document: branch |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "What answered (status, and `main`'s `x-page-cache`):",
    "",
    ...statuses,
    "",
  ].join("\n"),
);
