/**
 * Refetches every NHL team's logo from ESPN and writes the small marks the site serves itself:
 * `apps/web/public/team-marks/` and the list of them in `apps/web/lib/team-marks.generated.ts`.
 * Run by hand when a team changes its logo or the league gains a team: `pnpm team-marks`, then
 * commit what changed.
 *
 * ESPN's logos are 500px PNGs of about 70 KB; a mark is drawn 14px or 20px square. Each logo is
 * trimmed of its transparent margin, fitted into a square and written as WebP at the sizes in
 * `MARK_SIZES`. The dark logo is kept only where ESPN's differs from the plain one. A file's name
 * carries a hash of the team's marks, so the files can be cached for ever.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { MARK_SIZES, teamMarkFile } from "../apps/web/lib/team-mark.ts";
import { endpoints } from "../packages/espn/src/endpoints.ts";
import { translateTeams } from "../packages/espn/src/index.ts";

const OUT = new URL("../apps/web/public/team-marks/", import.meta.url);
const MANIFEST = new URL("../apps/web/lib/team-marks.generated.ts", import.meta.url);

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function mark(logo: Buffer, size: number): Promise<Buffer> {
  const trimmed = await sharp(logo).trim().toBuffer();
  return sharp(trimmed)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();
}

const teams = translateTeams(await (await fetch(endpoints.teams().url)).json());
if (teams.length === 0) throw new Error("ESPN sent no teams");

// Nothing on disk is touched until every logo has been fetched and shrunk.
const written: { name: string; body: Buffer }[] = [];
const entries: string[] = [];
let bytes = 0;
for (const team of teams.toSorted((a, b) => Number(a.id) - Number(b.id))) {
  if (team.logo == null) {
    console.warn(`${team.abbreviation}: ESPN sent no logo, so it gets no mark`);
    continue;
  }
  const light = await download(team.logo);
  const darkLogo = team.logoDark == null ? null : await download(team.logoDark);
  const dark = darkLogo != null && !darkLogo.equals(light) ? darkLogo : null;

  const files: { dark: boolean; size: number; body: Buffer }[] = [];
  for (const size of MARK_SIZES) {
    files.push({ dark: false, size, body: await mark(light, size) });
    if (dark != null) files.push({ dark: true, size, body: await mark(dark, size) });
  }
  const hash = createHash("sha256");
  for (const file of files) hash.update(file.body);
  const entry = { v: hash.digest("hex").slice(0, 8), dark: dark != null };
  for (const file of files) {
    written.push({ name: teamMarkFile(team.id, entry, file.dark, file.size), body: file.body });
    bytes += file.body.length;
  }
  entries.push(`  ${team.id}: { v: "${entry.v}", dark: ${entry.dark} }, // ${team.abbreviation}`);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const file of written) await writeFile(new URL(file.name, OUT), file.body);

await writeFile(
  MANIFEST,
  `// Written by \`pnpm team-marks\` (scripts/team-marks.ts). Do not edit by hand.
import type { TeamMarkEntry } from "./team-mark";

/** The teams with a mark in \`public/team-marks/\`, by ESPN's team id. */
export const TEAM_MARKS: Record<string, TeamMarkEntry> = {
${entries.join("\n")}
};
`,
);
const formatted = spawnSync(
  "pnpm",
  ["exec", "biome", "format", "--write", fileURLToPath(MANIFEST)],
  { stdio: "inherit" },
);
if (formatted.status !== 0) process.exitCode = 1;
console.log(
  `${entries.length} teams, ${(await readdir(OUT)).length} files, ${bytes} bytes in public/team-marks`,
);
