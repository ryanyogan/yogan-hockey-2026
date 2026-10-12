import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import vinext from "vinext";
import { defineConfig } from "vite";

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
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      // The Worker's configuration is `wrangler.jsonc`, which the plugin finds by itself.
      // The AI binding is the one binding with nothing local behind it, and the plugin opens a
      // session with the Cloudflare account for it as the dev server starts, which needs a
      // login. Off, so `pnpm dev` and CI need none; `AI_REMOTE=1 pnpm dev` makes real calls.
      remoteBindings: process.env.AI_REMOTE === "1",
    }),
  ],
}));
