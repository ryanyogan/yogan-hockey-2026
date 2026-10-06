import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const MIGRATIONS = fileURLToPath(new URL("../../packages/db/migrations", import.meta.url));

/**
 * Agent tests run inside the Workers runtime. The pool reads Wrangler config and
 * there is none, so the bindings from cloudflare.config.ts are repeated here.
 * The entry is the Agents and their routing alone: the site's entry needs vinext's build.
 */
export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      main: "./agents/test-worker.ts",
      miniflare: {
        // The newest date the pool's own workerd accepts; the Worker itself runs on 2026-10-06.
        compatibilityDate: "2026-08-22",
        compatibilityFlags: ["nodejs_compat"],
        durableObjects: {
          ScoreboardAgent: { className: "ScoreboardAgent", useSQLite: true },
          SkeletonAgent: { className: "SkeletonAgent", useSQLite: true },
        },
        d1Databases: ["DB"],
        kvNamespaces: ["VINEXT_KV_CACHE"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(MIGRATIONS),
          // A Worker secret in production. Tests replace `fetch`, so nothing reaches ntfy.sh.
          NTFY_TOPIC: "test-topic",
        },
      },
    }),
  ],
  resolve: {
    // vinext's plugin does this in the app; without it "next/cache" is not a module here.
    alias: { "next/cache": "vinext/shims/cache" },
  },
  test: { name: "web", include: ["agents/**/*.test.ts", "lib/**/*.test.ts"] },
}));
