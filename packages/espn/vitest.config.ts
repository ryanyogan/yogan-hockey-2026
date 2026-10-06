import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { name: "espn", include: ["src/**/*.test.ts", "check/**/*.test.ts"] },
});
