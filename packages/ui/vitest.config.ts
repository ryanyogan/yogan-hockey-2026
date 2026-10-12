import { defineConfig } from "vitest/config";

export default defineConfig({
  // The repo's tsconfig keeps JSX as it is for vinext to compile; a component's test compiles it.
  oxc: { jsx: { runtime: "automatic" } },
  test: { name: "ui", include: ["src/**/*.test.{ts,tsx}"] },
});
