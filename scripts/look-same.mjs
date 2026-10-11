// Compares two directories of `look-shots.mjs` shots pixel by pixel, for a change that must leave
// one width alone: shoot before it and after it, then
//
//   node scripts/look-same.mjs <before-dir> <after-dir> [width] [out.json]
//
// It exits 1 when a shot of that width (1440 unless given) differs by a single pixel, is a
// different size, or is in one directory only, and says where. Needs ImageMagick (`magick`).
// Scores (`/nhl/live`) always differs in one place: its "updated" stamp is the time of the shot.
import { spawnSync } from "node:child_process";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [before, after, width = "1440", out] = process.argv.slice(2);
if (!before || !after) {
  console.error("usage: node scripts/look-same.mjs <before-dir> <after-dir> [width] [out.json]");
  process.exit(2);
}

const shots = async (dir) =>
  (await readdir(dir)).filter((file) => file.includes(`-${width}-`) && file.endsWith(".png"));
const size = (file) =>
  spawnSync("magick", ["identify", "-format", "%wx%h", file], { encoding: "utf8" }).stdout;

const [had, has] = [await shots(before), await shots(after)];
const rows = [];
for (const file of [...new Set([...had, ...has])].sort()) {
  if (!had.includes(file) || !has.includes(file)) {
    rows.push({ file, same: false, why: `only in ${had.includes(file) ? before : after}` });
    continue;
  }
  const [a, b] = [join(before, file), join(after, file)];
  const [sizeA, sizeB] = [size(a), size(b)];
  if (sizeA !== sizeB) {
    rows.push({ file, same: false, why: `${sizeA} became ${sizeB}` });
    continue;
  }
  // The count of pixels that differ at all, which `compare` prints to its error stream.
  const compared = spawnSync("magick", ["compare", "-metric", "AE", a, b, "null:"], {
    encoding: "utf8",
  });
  const differing = Math.ceil(Number(compared.stderr.trim().split(/\s/)[0]));
  // Where: the box around every differing pixel, as width x height + left + top.
  const where =
    differing === 0
      ? null
      : spawnSync(
          "magick",
          [a, b, "-compose", "difference", "-composite", "-trim", "-format", "%wx%h%O", "info:"],
          { encoding: "utf8" },
        ).stdout;
  rows.push({
    file,
    size: sizeA,
    differing,
    same: differing === 0,
    ...(differing === 0 ? {} : { why: `${differing} pixels differ, within ${where}` }),
  });
}

if (out)
  await writeFile(out, `${JSON.stringify({ width: Number(width), shots: rows }, null, 2)}\n`);
const bad = rows.filter((row) => !row.same);
console.log(`${rows.length} shots at ${width}px, ${bad.length} differ`);
for (const row of bad) console.log(row.file, row.why);
process.exit(bad.length > 0 || rows.length === 0 ? 1 : 0);
