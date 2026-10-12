// Checks that a production build holds every font file its pages name: each `url(...)` of a font
// in the built stylesheets, and each font address in the Worker's own script (the preload links
// of `apps/web/src/head.ts`). A file that is named and not there is a 404 on the deployed site,
// which then draws the fallback faces for good, and `pnpm dev` does not show it.
//
//   node scripts/built-fonts.mjs [output-dir]
//
// Run it after a build (`pnpm build`, or `cf deploy --dry-run`, in apps/web). It reads the build
// and starts nothing; it exits 1 on a missing file, or on a build that names no font at all.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix } from "node:path";

const [output = "apps/web/.cloudflare/output/v0/workers/default"] = process.argv.slice(2);
const assets = join(output, "assets");
const FONT = /\.(?:woff2?|ttf|otf)$/;

/** Every file under `dir`, as a path from it. */
function files(dir, under = "") {
  return readdirSync(join(dir, under)).flatMap((name) => {
    const path = posix.join(under, name);
    return statSync(join(dir, path)).isDirectory() ? files(dir, path) : [path];
  });
}

if (!existsSync(assets)) {
  console.error(`no build at ${output}: build first`);
  process.exit(1);
}

/** A font's address as the browser would ask for it, and where it was named. */
const named = [];
for (const sheet of files(assets).filter((path) => path.endsWith(".css"))) {
  const css = readFileSync(join(assets, sheet), "utf8");
  for (const [, quoted] of css.matchAll(/url\(\s*([^)]+?)\s*\)/g)) {
    const address = quoted.replaceAll(/^['"]|['"]$/g, "").split(/[?#]/)[0];
    if (!FONT.test(address) || address.startsWith("data:")) continue;
    // A relative address is the stylesheet's own directory's.
    const path = address.startsWith("/") ? address : posix.join("/", dirname(sheet), address);
    named.push({ path, where: `${sheet} (${address})` });
  }
}
const sheets = named.length;
for (const script of files(join(output, "bundle")).filter((path) => path.endsWith(".js"))) {
  const js = readFileSync(join(output, "bundle", script), "utf8");
  for (const [, path] of js.matchAll(/["'`](\/[\w./-]+\.(?:woff2?|ttf|otf))["'`]/g)) {
    named.push({ path, where: `the Worker's ${script}` });
  }
}

const missing = named.filter(({ path }) => !existsSync(join(assets, path)));
for (const { path, where } of missing) console.error(`MISSING ${path}, named by ${where}`);
if (sheets === 0) console.error("the built stylesheets name no font file");
if (named.length === sheets) console.error("the Worker's script names no font file to preload");
const failed = missing.length > 0 || sheets === 0 || named.length === sheets;
if (!failed) {
  const distinct = new Set(named.map(({ path }) => path)).size;
  console.log(`ok: ${distinct} font files named by the stylesheets and the preloads, all built`);
}
process.exit(failed ? 1 : 0);
