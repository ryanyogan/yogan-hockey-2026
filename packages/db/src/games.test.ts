import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { createDb } from "./client.ts";
import { getGameWithPlays, replaceGamePlays, saveFinalGame } from "./games.ts";
import { finalGame, goal, periodStart } from "./test-fixtures.ts";

const db = createDb(env.DB);

test("a final game that was written is read back, with no plays until they are archived", async () => {
  const game = finalGame({ id: "game-written" });

  await saveFinalGame(db, game);

  expect(await getGameWithPlays(db, "game-written")).toEqual({ game, plays: [] });
});

test("a game that was never written reads as null", async () => {
  expect(await getGameWithPlays(db, "game-unknown")).toBeNull();
});

test("writing a final game again replaces its score and keeps one row", async () => {
  const first = finalGame({ id: "game-corrected" });
  const corrected = finalGame({
    id: "game-corrected",
    home: { ...first.home, score: 5 },
  });

  await saveFinalGame(db, first);
  await saveFinalGame(db, corrected);

  expect(await getGameWithPlays(db, "game-corrected")).toEqual({ game: corrected, plays: [] });
});

test("a game is listed under its US Eastern day, not the UTC day it started on", async () => {
  // 7:00 pm on 15 April in New York is already 16 April in UTC.
  await saveFinalGame(db, finalGame({ id: "game-late", startTime: "2026-04-16T02:00:00Z" }));

  const row = await db.query.games.findFirst({
    where: (games, { eq }) => eq(games.id, "game-late"),
  });
  expect(row?.date).toBe("2026-04-15");
});

test("a game's plays are read back whole and in the order they were given", async () => {
  await saveFinalGame(db, finalGame({ id: "game-plays" }));
  const plays = [periodStart({ id: "b" }), goal({ id: "c" }), goal({ id: "a", clock: "9:41" })];

  await replaceGamePlays(db, "game-plays", plays);

  expect((await getGameWithPlays(db, "game-plays"))?.plays).toEqual(plays);
});

test("replacing a game's plays drops the ones ESPN removed and takes the new order", async () => {
  await saveFinalGame(db, finalGame({ id: "game-reread" }));
  await saveFinalGame(db, finalGame({ id: "game-untouched" }));
  await replaceGamePlays(db, "game-reread", [periodStart({ id: "start" }), goal({ id: "goal" })]);
  await replaceGamePlays(db, "game-untouched", [goal({ id: "goal" })]);
  const reread = [
    goal({ id: "new-goal", text: "The goal ESPN added" }),
    periodStart({ id: "start" }),
  ];

  await replaceGamePlays(db, "game-reread", reread);

  expect((await getGameWithPlays(db, "game-reread"))?.plays).toEqual(reread);
  expect((await getGameWithPlays(db, "game-untouched"))?.plays).toEqual([goal({ id: "goal" })]);
});

test("a whole game of plays is written in one go", async () => {
  await saveFinalGame(db, finalGame({ id: "game-long" }));
  // The longest game the live probe recorded had 317 plays; this leaves room above it.
  const plays = Array.from({ length: 400 }, (_, index) => goal({ id: `play-${index}` }));

  await replaceGamePlays(db, "game-long", plays);

  expect((await getGameWithPlays(db, "game-long"))?.plays).toEqual(plays);
});

test("a failed replacement leaves the plays that were there", async () => {
  await saveFinalGame(db, finalGame({ id: "game-atomic" }));
  const archived = [periodStart({ id: "start" }), goal({ id: "goal" })];
  await replaceGamePlays(db, "game-atomic", archived);

  // ESPN never repeats a play id within a game, so the second row breaks the key.
  const replacement = replaceGamePlays(db, "game-atomic", [goal({ id: "x" }), goal({ id: "x" })]);

  await expect(replacement).rejects.toThrow();
  expect((await getGameWithPlays(db, "game-atomic"))?.plays).toEqual(archived);
});

test("plays cannot be written for a game that has no row", async () => {
  await expect(replaceGamePlays(db, "game-missing", [goal()])).rejects.toThrow();
});
