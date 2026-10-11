import { defineConfig } from "vitest/config";

export default defineConfig({
  // The components are JSX that the app's bundler compiles; a test that renders one compiles it here.
  oxc: { jsx: { runtime: "automatic" } },
  test: { name: "ui", include: ["src/**/*.test.ts"] },
});
