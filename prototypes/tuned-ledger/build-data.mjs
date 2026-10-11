// PROTOTYPE (#128). Rebuilds data.js and assets/team-marks from the repo's recorded ESPN fixtures.
// The output is committed, so running the prototype never needs this script or the app:
//   node prototypes/tuned-ledger/build-data.mjs
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const fixture = async (name) =>
  JSON.parse(await readFile(here(`../../packages/espn/fixtures/${name}.json`), "utf8"));

const [scoreboard, standings, summary] = await Promise.all([
  fixture("scoreboard"),
  fixture("standings"),
  fixture("summary-401803652"),
]);

/*
 * The recorded slate is nine games that have not started. So that Home shows a score, a live row
 * and a final, the prototype lays a state over them as if it were about 8:25 pm Central. Teams,
 * records, venues and start times are the fixture's; these scores and clocks are invented.
 */
const SLATE_STATE = {
  401891815: { status: "final", line: "final", away: 2, home: 3 },
  401892449: { status: "final", line: "final/OT", away: 3, home: 4 },
  401892450: { status: "final", line: "final", away: 4, home: 1 },
  401892451: { status: "live", line: "3rd 18:44", away: 2, home: 2 },
  401892453: { status: "live", line: "OT 2:10", away: 3, home: 3 },
  401892452: { status: "live", line: "3rd 9:02", away: 1, home: 2 },
  401891779: { status: "live", line: "2nd 14:20", away: 0, home: 1 },
};
/* The sample picks of apps/web/lib/sample-picks.ts, as the dashboard shots show them. */
const PICKS = {
  401891815: "MTL 52%",
  401892449: "TOR 58%",
  401892451: "NJ 61%",
  401892453: "BUF 64%",
  401892452: "NYR 53%",
  401891779: "CHI 56%",
  401892454: "SEA 59%",
  401891806: "LA 62%",
};

const teams = {};
const side = (competitor, score, won) => {
  const { id, abbreviation, displayName, color } = competitor.team;
  teams[id] = { id, abbreviation, name: displayName, color: color ? `#${color}` : null };
  return { id, abbreviation, record: competitor.records?.[0]?.summary ?? null, score, won };
};

const slate = scoreboard.events.map((event) => {
  const game = event.competitions[0];
  const state = SLATE_STATE[event.id] ?? { status: "scheduled", line: null };
  const of = (homeAway) => game.competitors.find((c) => c.homeAway === homeAway);
  const final = state.status === "final";
  return {
    id: event.id,
    startTime: event.date,
    status: state.status,
    line: state.line,
    away: side(of("away"), state.away ?? null, final && state.away > state.home),
    home: side(of("home"), state.home ?? null, final && state.home > state.away),
    pick: PICKS[event.id] ?? null,
    where: [game.venue?.fullName, ...(game.broadcasts ?? []).flatMap((b) => b.names)]
      .filter(Boolean)
      .join(" · "),
  };
});

const stat = (entry, name) => Number(entry.stats.find((s) => s.name === name)?.value ?? 0);
const divisions = standings.children.flatMap((conference) =>
  conference.children.map((division) => ({
    title: division.name,
    conference: conference.abbreviation,
    rows: division.standings.entries
      .map((entry) => {
        const { id, abbreviation, displayName } = entry.team;
        teams[id] ??= { id, abbreviation, name: displayName, color: null };
        return {
          id,
          abbreviation,
          name: displayName,
          gp: stat(entry, "gamesPlayed"),
          w: stat(entry, "wins"),
          l: stat(entry, "losses"),
          otl: stat(entry, "otLosses"),
          diff: stat(entry, "pointDifferential"),
          pts: stat(entry, "points"),
        };
      })
      .sort((a, b) => b.pts - a.pts || a.gp - b.gp || b.diff - a.diff || b.w - a.w),
  })),
);

/* The game: Dallas at Buffalo, recorded as a final. The prototype stops it at a live moment. */
const header = summary.header.competitions[0];
const gameSide = (homeAway) => {
  const competitor = header.competitors.find((c) => c.homeAway === homeAway);
  const { id, abbreviation, displayName, color } = competitor.team;
  teams[id] = { id, abbreviation, name: displayName, color: `#${color}` };
  return { id, abbreviation };
};
const game = { id: header.id, away: gameSide("away"), home: gameSide("home") };
const KEY = new Set(["goal", "shot-on-goal", "period-start", "period-end"]);
const plays = summary.plays.map((play) => {
  const type = play.type.abbreviation ?? play.type.text;
  const penalty = play.type.penaltyMinutes != null;
  const scoring = play.scoringPlay === true;
  const named = (role) =>
    play.participants?.filter((p) => p.type === role).map((p) => p.athlete.displayName) ?? [];
  return {
    id: play.id,
    type,
    text: play.text,
    period: play.period.number,
    periodText: play.period.displayValue,
    clock: play.clock.displayValue,
    teamId: play.team?.id ?? null,
    coordinate: play.coordinate ?? null,
    scoring,
    penalty,
    key: scoring || penalty || KEY.has(type),
    awayScore: play.awayScore,
    homeScore: play.homeScore,
    strength: play.strength?.abbreviation ?? null,
    scorer: scoring ? (named("scorer")[0] ?? null) : null,
    assists: scoring ? named("assister") : [],
  };
});

const banner = `// PROTOTYPE (#128). Written by build-data.mjs from packages/espn/fixtures. Do not edit by hand.\n`;
const body = `export const TEAMS = ${JSON.stringify(teams)};\nexport const SLATE = ${JSON.stringify(slate)};\nexport const DIVISIONS = ${JSON.stringify(divisions)};\nexport const GAME = ${JSON.stringify(game)};\nexport const PLAYS = ${JSON.stringify(plays)};\n`;
await writeFile(here("data.js"), banner + body);

/* Team marks: the site's own 42px images, under plain names. */
const from = here("../../apps/web/public/team-marks/");
const to = here("assets/team-marks/");
await mkdir(to, { recursive: true });
const dark = [];
for (const file of await readdir(from)) {
  const match = /^(\d+)(-dark)?-42\.[0-9a-f]+\.webp$/.exec(file);
  if (match == null || teams[match[1]] == null) continue;
  if (match[2]) dark.push(match[1]);
  await copyFile(from + file, `${to}${match[1]}${match[2] ?? ""}.webp`);
}
await writeFile(
  here("data.js"),
  `${banner}${body}export const DARK_MARKS = ${JSON.stringify(dark.sort())};\n`,
);
console.log(`${slate.length} games, ${divisions.length} divisions, ${plays.length} plays`);
