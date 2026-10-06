import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  // Pinned: left alone, the dev server moves from 5173 to 3000 when it restarts on a config change.
  // PORT overrides it, so two worktrees can run their dev servers side by side.
  // Fixture mode (`ESPN_FIXTURES=1 pnpm dev`): the Worker does not see the shell's environment, so
  // the switch is compiled in. A build without it drops the recorded responses altogether.
  define: { "process.env.ESPN_FIXTURES": JSON.stringify(process.env.ESPN_FIXTURES ?? "") },
  server: { port: Number(process.env.PORT ?? 5173), strictPort: true },
  plugins: [
    vinext({
      cache: { data: kvDataAdapter() },
    }),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
