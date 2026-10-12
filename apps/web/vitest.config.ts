import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const MIGRATIONS = fileURLToPath(new URL("../../packages/db/migrations", import.meta.url));

/**
 * Agent tests run inside the Workers runtime, with the bindings `wrangler.jsonc` declares: a new
 * Agent or binding goes there and nowhere else. `AI` is declared but has nothing behind
 * it here (see "Predictions" in the build notes).
 * The entry is the Agents and their routing alone: the site's entry needs vinext's build.
 */
export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      main: "./agents/test-worker.ts",
      // Off: on, the plugin opens a session with the Cloudflare account for the AI binding, which
      // needs a login that CI does not have.
      remoteBindings: false,
      miniflare: {
        bindings: { TEST_MIGRATIONS: await readD1Migrations(MIGRATIONS) },
      },
    }),
  ],
  resolve: {
    // vinext's plugin does this in the app; without it "next/cache" is not a module here.
    alias: { "next/cache": "vinext/shims/cache" },
  },
  test: { name: "web", include: ["agents/**/*.test.ts", "lib/**/*.test.ts"] },
}));
