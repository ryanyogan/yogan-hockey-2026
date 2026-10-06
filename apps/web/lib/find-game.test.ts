import type { GameHeader, GameSnapshot } from "@yogan-hockey/schemas";
import { expect, test, vi } from "vitest";
import { findGame } from "./find-game";
import { recordedShootout } from "./game/test-plays";

const nothing: GameSnapshot = {
  header: null,
  delayed: false,
  archived: false,
  plays: [],
  notFound: false,
};

async function header(): Promise<GameHeader> {
  return (await recordedShootout()).header;
}

test("an id that cannot be ESPN's is missing, and no Agent is asked", async () => {
  const read = vi.fn();

  expect(await findGame("abc", read)).toEqual({ state: "missing" });
  expect(read).not.toHaveBeenCalled();
});

test("a game ESPN does not have is missing", async () => {
  const read = vi.fn().mockResolvedValue({ ...nothing, notFound: true });

  expect(await findGame("401803652", read)).toEqual({ state: "missing" });
  expect(read).toHaveBeenCalledTimes(1);
});

test("a game with a header is found", async () => {
  const snapshot = { ...nothing, header: await header() };
  const read = vi.fn().mockResolvedValue(snapshot);

  expect(await findGame("401803652", read)).toEqual({ state: "found", game: snapshot });
  expect(read).toHaveBeenCalledTimes(1);
});

test("a read that throws is made once more", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const snapshot = { ...nothing, header: await header() };
  const read = vi.fn().mockRejectedValueOnce(new Error("cold")).mockResolvedValueOnce(snapshot);

  expect(await findGame("401803652", read)).toEqual({ state: "found", game: snapshot });
  expect(read).toHaveBeenCalledTimes(2);
});

test("no header and no 'not found' is a game ESPN could not give: unreadable, and not asked again", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const read = vi.fn().mockResolvedValue(nothing);

  expect(await findGame("401803652", read)).toEqual({ state: "unreadable" });
  expect(read).toHaveBeenCalledTimes(1);
});

test("a read that throws twice is a game that could not be read, not an error", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const failing = vi.fn().mockRejectedValue(new Error("down"));

  expect(await findGame("401803652", failing)).toEqual({ state: "unreadable" });
  expect(failing).toHaveBeenCalledTimes(2);
});
