import { expect, test, vi } from "vitest";
import { readScoreboard } from "./scoreboard";

test("first paint is today's games as a plain object a client component can be given", async () => {
  vi.stubEnv("ESPN_FIXTURES", "1");

  const state = await readScoreboard();

  expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
  expect(state.date).toBe("2026-10-06");
  expect(state.games).toHaveLength(9);
  expect(structuredClone(state)).toEqual(state);
  // The first call starts the Agent cold, which takes seconds on a machine busy with other suites.
}, 30_000);
