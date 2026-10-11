import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";

/**
 * `experimental.inlineCss` for a Worker (#127). vinext 1.0.1 rewrites a document's stylesheet
 * links as `<style>` from `globalThis.__VINEXT_INLINE_CSS__`, a map of href to CSS, but only its
 * Node server fills that map (`vinext/dist/server/prod-server.js`). This writes the same line at
 * the head of the Worker's server entry once the client build has written the stylesheets, so
 * the first paint does not wait a second round trip for 9 kB. A navigation still links the file.
 * The build log says "inlined ..." when it has; check that it still does after a vinext bump.
 */
const WORKER_OUTPUT = ".cloudflare/output/v0/workers/default";
const INLINE_CSS_MARKER = "globalThis.__VINEXT_INLINE_CSS__ = ";
function inlineStylesheets(): Plugin {
  return {
    name: "yogan-hockey:inline-stylesheets",
    apply: "build",
    closeBundle: {
      order: "post",
      sequential: true,
      handler() {
        const styles = `${WORKER_OUTPUT}/assets/_next/static/css`;
        const entry = `${WORKER_OUTPUT}/bundle/ssr/index.js`;
        if (!existsSync(styles) || !existsSync(entry)) return;
        const code = readFileSync(entry, "utf8");
        if (code.includes(INLINE_CSS_MARKER)) return;
        const manifest = Object.fromEntries(
          readdirSync(styles)
            .filter((name) => name.endsWith(".css"))
            .map((name) => [
              `/_next/static/css/${name}`,
              readFileSync(`${styles}/${name}`, "utf8"),
            ]),
        );
        if (Object.keys(manifest).length === 0) return;
        writeFileSync(entry, `${INLINE_CSS_MARKER}${JSON.stringify(manifest)};\n${code}`);
        console.log(`inlined ${Object.keys(manifest).join(", ")} into the Worker's documents`);
      },
    },
  };
}

/**
 * GSAP's notice, which its licence says stays with the code. The minifier drops every comment,
 * so the notice is read from the package and written back at the head of the one chunk GSAP is
 * in (`components/game/rink-player.ts`, imported lazily and so a chunk of its own).
 */
function gsapNotice(): string {
  const packaged = createRequire(import.meta.url).resolve("gsap/dist/gsap.min.js");
  const notice = /^\/\*![\s\S]*?\*\//.exec(readFileSync(packaged, "utf8"))?.[0];
  if (!notice?.includes("@license")) throw new Error("GSAP's licence notice was not found");
  return notice;
}
const GSAP_CHUNK = "rink-player";

export default defineConfig(({ command }) => ({
  // Pinned: left alone, the dev server moves from 5173 to 3000 when it restarts on a config change.
  // PORT overrides it, so two worktrees can run their dev servers side by side.
  // Fixture mode (`ESPN_FIXTURES=1 pnpm dev`): the Worker does not see the shell's environment, so
  // the switch is compiled in. A build without it drops the recorded responses altogether.
  // The page cache's build id (`lib/page-cache.ts`): each build reads only its own entries, so a
  // deploy never serves HTML that names the build before's assets. Empty under `pnpm dev`, which
  // turns the page cache off.
  define: {
    "process.env.ESPN_FIXTURES": JSON.stringify(process.env.ESPN_FIXTURES ?? ""),
    "process.env.PAGE_CACHE_BUILD": JSON.stringify(
      command === "build" ? (process.env.PAGE_CACHE_BUILD ?? Date.now().toString(36)) : "",
    ),
  },
  server: { port: Number(process.env.PORT ?? 5173), strictPort: true },
  environments: {
    client: {
      build: {
        rolldownOptions: {
          output: { postBanner: (chunk) => (chunk.name === GSAP_CHUNK ? gsapNotice() : "") },
        },
      },
    },
  },
  plugins: [
    vinext({
      cache: { data: kvDataAdapter() },
    }),
    inlineStylesheets(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      // The AI binding is the one binding with nothing local behind it, and the plugin opens a
      // session with the Cloudflare account for it as the dev server starts, which needs a
      // login. Off, so `pnpm dev` and CI need none; `AI_REMOTE=1 pnpm dev` makes real calls.
      remoteBindings: process.env.AI_REMOTE === "1",
    }),
  ],
}));
