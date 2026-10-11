import { defineConfig } from "vitest/config";

// The pure parts of the measuring scripts. The scripts themselves drive a browser and are run by hand.
export default defineConfig({
  test: { name: "scripts", include: ["performance/**/*.test.ts"] },
});
