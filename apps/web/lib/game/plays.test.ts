import { describe, expect, test } from "vitest";
import {
  focusedPlay,
  markKind,
  playTime,
  scoringPlays,
  statusLines,
  teamAbbreviation,
  toggleSelection,
  visiblePlays,
} from "./plays";
import { BUFFALO, DALLAS, play, recordedShootout } from "./test-plays";

describe("visiblePlays", () => {
  test("a game opens on its key plays and shows every play on request", async () => {
    const { plays } = await recordedShootout();
    const key = visiblePlays(plays, false);
    expect(visiblePlays(plays, true)).toHaveLength(307);
    expect(key.length).toBeLessThan(307);
    // 11 goals (5 in the shootout), 6 penalties, 47 shots on goal, 5 period starts, 5 period ends.
    expect(key).toHaveLength(74);
    expect(key.some((p) => p.type === "faceoff" || p.type === "hit")).toBe(false);
  });

  test("the order is the game's", () => {
    const first = play({ type: "period-start" });
    const hit = play({ type: "hit" });
    const goal = play({ type: "goal", scoring: true });
    expect(visiblePlays([first, hit, goal], false)).toEqual([first, goal]);
  });
});

describe("selection", () => {
  const faceoff = play({ type: "faceoff" });
  const shot = play();
  const latest = play({ type: "stoppage" });
  const plays = [faceoff, shot, latest];

  test("with nothing selected the rink follows the latest play", () => {
    expect(focusedPlay(plays, null)).toBe(latest);
  });

  test("a selected play is the one in focus", () => {
    expect(focusedPlay(plays, shot.id)).toBe(shot);
  });

  test("a selection the game no longer has falls back to the latest play", () => {
    expect(focusedPlay(plays, "gone")).toBe(latest);
  });

  test("a game with no plays has nothing in focus", () => {
    expect(focusedPlay([], null)).toBeNull();
  });

  test("clicking a play selects it, and clicking it again goes back to following", () => {
    expect(toggleSelection(null, shot.id)).toBe(shot.id);
    expect(toggleSelection(faceoff.id, shot.id)).toBe(shot.id);
    expect(toggleSelection(shot.id, shot.id)).toBeNull();
  });
});

describe("markKind", () => {
  test("goals, penalties and shots are told apart; the rest are plain", () => {
    expect(markKind(play({ type: "goal", scoring: true }))).toBe("goal");
    expect(markKind(play({ type: "Hooking", penalty: true }))).toBe("penalty");
    expect(markKind(play({ type: "shot-on-goal" }))).toBe("save");
    expect(markKind(play({ type: "shot-missed" }))).toBe("shot");
    expect(markKind(play({ type: "shot-blocked" }))).toBe("shot");
    expect(markKind(play({ type: "hit" }))).toBe("hit");
    expect(markKind(play({ type: "faceoff" }))).toBe("other");
  });
});

describe("scoringPlays", () => {
  test("the goals of the game, with the shootout's kept apart because they move no score", async () => {
    const { plays } = await recordedShootout();
    const { goals, shootout } = scoringPlays(plays);
    expect(goals.map((p) => `${p.periodText} ${p.clock} ${p.awayScore}-${p.homeScore}`)).toEqual([
      "1st 2:19 1-0",
      "1st 12:48 1-1",
      "2nd 3:32 1-2",
      "2nd 4:24 2-2",
      "2nd 11:09 2-3",
      "2nd 16:00 3-3",
    ]);
    expect(shootout).toHaveLength(5);
    expect(shootout.every((p) => p.periodText === "SO")).toBe(true);
  });
});

describe("wording", () => {
  test("a play's time is its period and clock; a shootout attempt has no clock", () => {
    expect(playTime(play({ periodText: "2nd", clock: "4:24" }))).toBe("2nd 4:24");
    expect(playTime(play({ period: 5, periodText: "SO", clock: "0:00" }))).toBe("SO");
  });

  test("a play's team is named by its abbreviation, and a play with no team by nothing", async () => {
    const { header } = await recordedShootout();
    expect(teamAbbreviation(header, BUFFALO)).toBe("BUF");
    expect(teamAbbreviation(header, DALLAS)).toBe("DAL");
    expect(teamAbbreviation(header, null)).toBe("");
  });

  test("a finished game's status is ESPN's wording", async () => {
    const { header } = await recordedShootout();
    expect(statusLines(header)).toEqual({ live: false, text: "Final/SO" });
  });

  test("a live game's status is its period and the time left in it", async () => {
    const { header } = await recordedShootout();
    const live = { ...header, status: "live" as const, period: 2, clock: "12:34" };
    expect(statusLines(live)).toEqual({ live: true, text: "2nd 12:34" });
    expect(statusLines({ ...live, period: 4, clock: "3:10" })).toEqual({
      live: true,
      text: "OT 3:10",
    });
    expect(statusLines({ ...live, period: 5, clock: "0:00" })).toEqual({ live: true, text: "SO" });
  });
});
