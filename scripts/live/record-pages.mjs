/**
 * Asks the deployed site for its cached pages afresh through a game's final, for the live game
 * verification (#54): does a final re-key `/nhl` and both teams' pages, and how soon.
 *
 *   node scripts/live/record-pages.mjs <outDir> <hours> <teamId:Team Name> <teamId:Team Name> [origin]
 *
 * Every 30 seconds, a plain GET of `/nhl` and of each team's page. One JSON line each in
 * `<outDir>/pages.jsonl`: the status, the `x-page-cache` and `x-page-cache-age` headers, each
 * team's row in the standings as the page words it, a hash of the page's text, and a team page's
 * text whenever it changes.
 */
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [outDir, hours = "4", first, second, origin = "https://hockey.yogan.dev"] =
  process.argv.slice(2);
if (!outDir || !first || !second) {
  console.error(
    "usage: record-pages.mjs <outDir> <hours> <teamId:Team Name> <teamId:Team Name> [origin]",
  );
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const file = `${outDir}/pages.jsonl`;
const teams = [first, second].map((spec) => {
  const [id, ...name] = spec.split(":");
  return { id, name: name.join(":") };
});
const paths = ["/nhl", ...teams.map((team) => `/nhl/teams/${team.id}`)];
const textOf = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/\s+/g, " ");

const seen = new Map();

async function ask(path) {
  const line = { t: new Date().toISOString(), path };
  try {
    const sent = Date.now();
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(25_000) });
    const html = await response.text();
    const text = textOf(html);
    line.ms = Date.now() - sent;
    line.status = response.status;
    line.cache = response.headers.get("x-page-cache");
    line.age = response.headers.get("x-page-cache-age");
    line.cacheControl = response.headers.get("cache-control");
    line.textHash = createHash("sha1").update(text).digest("hex").slice(0, 10);
    if (path === "/nhl") {
      line.rows = teams.map(
        (team) => new RegExp(`${team.name}((?: [-+]?\\d+){6})`).exec(text)?.[1]?.trim() ?? null,
      );
    } else {
      line.records = [...text.matchAll(/\b\d{1,2}-\d{1,2}-\d{1,2}\b/g)]
        .slice(0, 4)
        .map((match) => match[0]);
      // The whole text when it differs from the last answer, to read the change from afterwards.
      if (seen.get(path) !== line.textHash) line.text = text.slice(0, 6000);
      seen.set(path, line.textHash);
    }
  } catch (error) {
    line.error = String(error).slice(0, 300);
  }
  appendFileSync(file, `${JSON.stringify(line)}\n`);
}

const started = Date.now();
const deadline = started + Number(hours) * 3600_000;
console.log(`asking ${paths.join(", ")} every 30 seconds, writing ${file}`);
for (let tick = 0; Date.now() < deadline; tick++) {
  await Promise.all(paths.map(ask));
  const wait = started + (tick + 1) * 30_000 - Date.now();
  if (wait > 0) await sleep(wait);
}
console.log("done");
