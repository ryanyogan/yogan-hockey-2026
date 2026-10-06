import { defineConfig, devices } from "@playwright/test";

// The port the dev server is pinned to in apps/web/vite.config.ts, which reads the same variable.
const PORT = Number(process.env.PORT ?? 5173);

export default defineConfig({
  testDir: "./e2e",
  // One at a time: the tests share one dev server, and Vite reloads every open page when a route
  // first compiles, which loses clicks and state in a test running beside it.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    // Fixture mode: the smoke tests see ESPN's recorded responses, not tonight's games.
    env: { ESPN_FIXTURES: "1" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
