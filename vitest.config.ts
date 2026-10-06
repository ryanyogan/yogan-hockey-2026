import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // apps/web runs inside the Workers runtime; the packages run in Node.
    projects: ["packages/*/vitest.config.ts", "apps/web/vitest.config.ts"],
  },
});
