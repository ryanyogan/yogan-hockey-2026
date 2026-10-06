import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { createDb, gameHasPlays } from "@yogan-hockey/db";
import { beforeAll, expect, test, vi } from "vitest";
import { archiveGame, readGame } from "./game";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

// The first call to an Agent starts it cold, which takes seconds on a machine busy with other suites.
const COLD_START = 30_000;

test(
  "first paint is the game as a plain object a client component can be given",
  async () => {
    vi.stubEnv("ESPN_FIXTURES", "1");

    const snapshot = await readGame("401892449");

    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
    expect(snapshot).toMatchObject({
      header: { id: "401892449", status: "scheduled", home: { abbreviation: "TOR" } },
      plays: [],
      delayed: false,
      archived: false,
      notFound: false,
    });
    expect(structuredClone(snapshot)).toEqual(snapshot);
  },
  COLD_START,
);

test(
  "a finished game nobody watched is archived on request",
  async () => {
    vi.stubEnv("ESPN_FIXTURES", "1");

    expect(await archiveGame("401803652")).toBe(true);

    expect(await gameHasPlays(createDb(env.DB), "401803652")).toBe(true);
    const snapshot = await readGame("401803652");
    expect(snapshot.archived).toBe(true);
    expect(snapshot.plays).toHaveLength(307);
  },
  COLD_START,
);
