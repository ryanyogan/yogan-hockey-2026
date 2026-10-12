import type { GameHeader, Pregame } from "@yogan-hockey/schemas";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FoundGame, GameLookup } from "./find-game";
import { type GamePageReads, readGamePage } from "./game-page";

const header = (status: GameHeader["status"]) => ({ id: "401", status }) as GameHeader;
const game = (status: GameHeader["status"], archived = false): FoundGame => ({
  header: header(status),
  plays: [],
  delayed: false,
  archived,
  notFound: false,
});
const pregame = { venue: "the rink" } as unknown as Pregame;

/** The page's reads, each answering as a test says and counting its calls. */
function reads(found: GameLookup, over: Partial<GamePageReads> = {}) {
  return {
    find: vi.fn(async () => found),
    replay: vi.fn(async (read: FoundGame) => read),
    pick: vi.fn(async () => ({ state: "pending" as const })),
    pregame: vi.fn(async () => pregame),
    ...over,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("a game page's read", () => {
  it("asks for the game once, and for nothing more when there is no such game", async () => {
    const page = reads({ state: "missing" });
    expect(await readGamePage("401", page)).toEqual({ state: "missing" });
    expect(page.find).toHaveBeenCalledTimes(1);
    expect(page.replay).not.toHaveBeenCalled();
    expect(page.pick).not.toHaveBeenCalled();
    expect(page.pregame).not.toHaveBeenCalled();
  });

  it("says a game that could not be read is unreadable, and reads nothing more", async () => {
    const page = reads({ state: "unreadable" });
    expect(await readGamePage("401", page)).toEqual({ state: "unreadable" });
    expect(page.pick).not.toHaveBeenCalled();
  });

  it("gives a game still to come its pick and its matchup facts", async () => {
    const page = reads({ state: "found", game: game("scheduled") });
    expect(await readGamePage("401", page)).toEqual({
      state: "found",
      game: game("scheduled"),
      pick: { state: "pending" },
      pregame,
    });
    expect(page.find).toHaveBeenCalledTimes(1);
  });

  it("draws a game still to come without its matchup facts when they cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const page = reads(
      { state: "found", game: game("scheduled") },
      { pregame: vi.fn(async () => Promise.reject(new Error("ESPN is down"))) },
    );
    expect(await readGamePage("401", page)).toMatchObject({ state: "found", pregame: null });
  });

  it("asks for no matchup facts for a game that has started", async () => {
    const page = reads({ state: "found", game: game("live") });
    expect(await readGamePage("401", page)).toMatchObject({ state: "found", pregame: null });
    expect(page.pregame).not.toHaveBeenCalled();
  });

  it("sends a made pick without what the model was given to make it", async () => {
    const prediction = {
      gameId: "401",
      status: "made" as const,
      madeAt: "2026-10-06T16:00:00Z",
      model: "a model",
      inputs: { prompt: "everything the model was told" },
      pickTeamId: "21",
      winProbability: 0.58,
      reasoning: "Home ice.",
      keyFactors: [],
    };
    const page = reads(
      { state: "found", game: game("scheduled") },
      { pick: vi.fn(async () => ({ state: "made" as const, prediction, final: null })) },
    );
    const { inputs: _inputs, ...sent } = prediction;
    expect(await readGamePage("401", page)).toMatchObject({
      pick: { state: "made", prediction: sent, final: null },
    });
    expect(JSON.stringify(await readGamePage("401", page))).not.toContain("everything the model");
  });

  it("reads a finished game's pick after the game is made ready for its Replay", async () => {
    const order: string[] = [];
    const page = reads(
      { state: "found", game: game("final") },
      {
        replay: vi.fn(async (read: FoundGame) => {
          order.push("replay");
          return { ...read, archived: true };
        }),
        pick: vi.fn(async () => {
          order.push("pick");
          return { state: "none" as const };
        }),
      },
    );
    expect(await readGamePage("401", page)).toEqual({
      state: "found",
      game: game("final", true),
      pick: { state: "none" },
      pregame: null,
    });
    expect(order).toEqual(["replay", "pick"]);
  });
});
