import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const MIGRATIONS = fileURLToPath(new URL("./migrations", import.meta.url));

/** The query helpers run against local D1 inside the Workers runtime, as they do in the Worker. */
export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      miniflare: {
        // The newest date the pool's own workerd accepts (see apps/web/vitest.config.ts).
        compatibilityDate: "2026-08-22",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["DB"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(MIGRATIONS),
        },
      },
    }),
  ],
  test: { name: "db", include: ["src/**/*.test.ts"], setupFiles: ["./src/test-setup.ts"] },
}));
