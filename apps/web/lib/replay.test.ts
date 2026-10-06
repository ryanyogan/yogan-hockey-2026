import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { createDb, gameHasPlays } from "@yogan-hockey/db";
import { beforeAll, expect, test, vi } from "vitest";
import type { FoundGame } from "./find-game";
import { archiveGame, readGame } from "./game";
import { replayGame, replayPlays } from "./replay";

// The first call to an Agent starts it cold, which takes seconds on a machine busy with other suites.
const COLD_START = 30_000;
const SHOOTOUT = "401803652";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

test(
  "a finished game nobody watched is archived by its first open, and read from D1 alone after",
  async () => {
    vi.stubEnv("ESPN_FIXTURES", "1");
    const db = createDb(env.DB);
    expect(await gameHasPlays(db, SHOOTOUT)).toBe(false);

    const archive = vi.fn(archiveGame);
    const first = await replayPlays(SHOOTOUT, archive);

    expect(first).toHaveLength(307);
    expect(first?.at(-1)?.type).toBe("end-of-game");
    expect(archive).toHaveBeenCalledTimes(1);
    expect(await gameHasPlays(db, SHOOTOUT)).toBe(true);

    // The second open: no Agent, no ESPN.
    const never = vi.fn().mockRejectedValue(new Error("the second open asked for an archive"));
    expect(await replayPlays(SHOOTOUT, never)).toEqual(first);
    expect(never).not.toHaveBeenCalled();
  },
  COLD_START,
);

test("a game that cannot be archived yet has no Replay", async () => {
  expect(await replayPlays("9000001", async () => false)).toBeNull();
});

test(
  "a finished game's page is handed D1's plays; a game not over is left as it was read",
  async () => {
    vi.stubEnv("ESPN_FIXTURES", "1");
    const final = (await readGame(SHOOTOUT)) as FoundGame;
    const unarchived: FoundGame = { ...final, archived: false, plays: [] };

    const replay = await replayGame(unarchived);
    expect(replay.archived).toBe(true);
    expect(replay.plays).toHaveLength(307);

    const scheduled = (await readGame("401892449")) as FoundGame;
    expect(await replayGame(scheduled)).toBe(scheduled);

    // One that will not archive stays a finished game with the plays it came with.
    const stuck: FoundGame = { ...unarchived, header: { ...final.header, id: "9000002" } };
    expect(await replayGame(stuck, async () => false)).toBe(stuck);

    // Nor does one whose archive fails take the page down.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = async () => Promise.reject(new Error("D1 is down"));
    expect(await replayGame(stuck, failing)).toBe(stuck);
  },
  COLD_START,
);
