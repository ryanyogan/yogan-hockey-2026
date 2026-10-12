// Writes the comparison of two sites measured in turn by scripts/performance-compare.sh.
//
//   node scripts/performance/compare-report.ts <runs-dir> <out-without-extension>
//
// <runs-dir> holds main-*.json and branch-*.json, each a short measurement of
// scripts/measure-performance.ts. Written: <out>-main.json and .md and <out>-branch.json and
// .md (each site's runs joined into one measurement, with the usual tables), and <out>.md, the
// baseline, `main` today and the branch today side by side.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Measurement, report } from "./budgets.ts";
import { comparison, merge } from "./compare.ts";

const [runs, out] = process.argv.slice(2);
if (!runs || !out) {
  console.error("usage: compare-report.ts <runs-dir> <out-without-extension>");
  process.exit(1);
}
const read = (path: string): Measurement => JSON.parse(readFileSync(path, "utf8"));
const side = (name: string) => {
  const files = readdirSync(runs)
    .filter((file) => file.startsWith(`${name}-`) && file.endsWith(".json"))
    .sort();
  if (files.length === 0) throw new Error(`${runs} has no ${name}-*.json`);
  const merged = merge(files.map((file) => read(join(runs, file))));
  writeFileSync(`${out}-${name}.json`, `${JSON.stringify(merged, null, 1)}\n`);
  writeFileSync(`${out}-${name}.md`, report(merged));
  return merged;
};
const baseline = read(
  new URL("../../docs/performance/results/local.json", import.meta.url).pathname,
);
writeFileSync(`${out}.md`, comparison({ baseline, main: side("main"), branch: side("branch") }));
console.error(`wrote ${out}.md, ${out}-main.* and ${out}-branch.*`);
