/**
 * Records a short sequence of whole summaries of one game while it is being played, for the Game
 * Agent's diff tests (new, changed and removed plays). Run by hand during a game:
 *
 *   node packages/espn/scripts/record-live.ts <eventId> [polls=4] [seconds=10]
 *
 * Each poll is written exactly as ESPN sent it, to `fixtures/live/summary-<eventId>-<n>.json`.
 * To shorten a sequence, delete whole polls; never edit inside one. The files sit in their own
 * directory so fixture mode, which answers from `fixtures/*.json`, does not see them.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { endpoints } from "../src/endpoints.ts";

const [eventId, polls = "4", seconds = "10"] = process.argv.slice(2);
if (!eventId) {
  console.error("usage: record-live.ts <eventId> [polls=4] [seconds=10]");
  process.exit(1);
}

const endpoint = endpoints.summary(eventId);
const directory = new URL("../fixtures/live/", import.meta.url);
await mkdir(directory, { recursive: true });

for (let poll = 1; poll <= Number(polls); poll++) {
  if (poll > 1) await sleep(Number(seconds) * 1000);
  const response = await fetch(endpoint.url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    console.error(`FAILED poll ${poll}: HTTP ${response.status}`);
    process.exitCode = 1;
    continue;
  }
  const body = await response.text();
  const summary = JSON.parse(body) as {
    plays?: unknown[];
    header?: { competitions?: { status?: { type?: { state?: string } } }[] };
  };
  const name = `${endpoint.fixture}-${String(poll).padStart(2, "0")}.json`;
  await writeFile(new URL(name, directory), body);
  const state = summary.header?.competitions?.[0]?.status?.type?.state;
  console.log(
    `poll ${poll}: ${state}, ${summary.plays?.length ?? 0} plays -> fixtures/live/${name}`,
  );
}
