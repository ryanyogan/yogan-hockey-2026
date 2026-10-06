import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  // Pinned: left alone, the dev server moves from 5173 to 3000 when it restarts on a config change.
  // PORT overrides it, so two worktrees can run their dev servers side by side.
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
