import { describe, expect, test } from "vitest";
import {
  applyGameStreamMessage,
  diffPlays,
  type GameStreamMessage,
  parseGameStreamMessage,
} from "./game-stream.ts";
import type { Play } from "./play.ts";

function play(id: string, text = `play ${id}`): Play {
  return {
    id,
    type: "shot-on-goal",
    typeText: "Shot",
    period: 1,
    periodText: "1st",
    clock: "1:00",
    text,
    teamId: "2",
    coordinate: null,
    scoring: false,
    penalty: false,
    homeScore: 0,
    awayScore: 0,
    strength: null,
    wallclock: null,
    participants: [],
  };
}

const ids = (plays: Play[]) => plays.map((entry) => entry.id);

/** What a viewer holding `before` holds once it has been sent the difference to `after`. */
function follow(before: Play[], after: Play[]): { plays: Play[]; messages: GameStreamMessage[] } {
  const messages = diffPlays(before, after);
  return { plays: messages.reduce(applyGameStreamMessage, before), messages };
}

describe("applying a message to a viewer's plays", () => {
  test("`plays` replaces the whole list", () => {
    const plays = applyGameStreamMessage([play("9")], {
      type: "plays",
      plays: [play("1"), play("2")],
    });

    expect(ids(plays)).toEqual(["1", "2"]);
  });

  test("`play-added` puts the play at its place in the game", () => {
    const end = applyGameStreamMessage([play("1")], {
      type: "play-added",
      index: 1,
      play: play("2"),
    });
    const middle = applyGameStreamMessage(end, { type: "play-added", index: 1, play: play("3") });

    expect(ids(end)).toEqual(["1", "2"]);
    expect(ids(middle)).toEqual(["1", "3", "2"]);
  });

  test("`play-changed` replaces the play of that id, where the message says it now sits", () => {
    const before = [play("1"), play("2"), play("3")];

    const reworded = applyGameStreamMessage(before, {
      type: "play-changed",
      index: 1,
      play: play("2", "reworded"),
    });
    const moved = applyGameStreamMessage(before, {
      type: "play-changed",
      index: 0,
      play: play("3"),
    });

    expect(reworded.map((entry) => entry.text)).toEqual(["play 1", "reworded", "play 3"]);
    expect(ids(moved)).toEqual(["3", "1", "2"]);
  });

  test("`play-removed` takes the play out", () => {
    const plays = applyGameStreamMessage([play("1"), play("2")], { type: "play-removed", id: "1" });

    expect(ids(plays)).toEqual(["2"]);
  });

  test("a message that arrives twice changes nothing the second time", () => {
    const added: GameStreamMessage = { type: "play-added", index: 1, play: play("2") };
    const removed: GameStreamMessage = { type: "play-removed", id: "1" };

    const once = applyGameStreamMessage([play("1")], added);
    expect(applyGameStreamMessage(once, added)).toEqual(once);
    const gone = applyGameStreamMessage(once, removed);
    expect(applyGameStreamMessage(gone, removed)).toEqual(gone);
  });

  test("the list it was given is left as it was", () => {
    const before = [play("1")];

    applyGameStreamMessage(before, { type: "play-added", index: 0, play: play("2") });

    expect(ids(before)).toEqual(["1"]);
  });
});

describe("the difference between two polls", () => {
  test("nothing when ESPN sends the same plays", () => {
    expect(diffPlays([play("1"), play("2")], [play("1"), play("2")])).toEqual([]);
  });

  test("one `play-added` for each new play", () => {
    const { plays, messages } = follow([play("1")], [play("1"), play("2"), play("3")]);

    expect(messages).toEqual([
      { type: "play-added", index: 1, play: play("2") },
      { type: "play-added", index: 2, play: play("3") },
    ]);
    expect(ids(plays)).toEqual(["1", "2", "3"]);
  });

  test("one `play-changed` for a play ESPN revised", () => {
    const { plays, messages } = follow(
      [play("1"), play("2")],
      [play("1", "now a goal"), play("2")],
    );

    expect(messages).toEqual([{ type: "play-changed", index: 0, play: play("1", "now a goal") }]);
    expect(plays[0]?.text).toBe("now a goal");
  });

  test("one `play-removed` for a play missing from the new list", () => {
    const { plays, messages } = follow([play("1"), play("2"), play("3")], [play("1"), play("3")]);

    expect(messages).toEqual([{ type: "play-removed", id: "2" }]);
    expect(ids(plays)).toEqual(["1", "3"]);
  });

  test("a play ESPN adds in the middle lands in the middle", () => {
    const { plays, messages } = follow([play("1"), play("3")], [play("1"), play("2"), play("3")]);

    expect(messages).toEqual([{ type: "play-added", index: 1, play: play("2") }]);
    expect(ids(plays)).toEqual(["1", "2", "3"]);
  });

  test("the order is the list's: plays ESPN reorders are moved", () => {
    const { plays, messages } = follow(
      [play("1"), play("2"), play("3")],
      [play("1"), play("3"), play("2")],
    );

    expect(messages).toEqual([{ type: "play-changed", index: 1, play: play("3") }]);
    expect(ids(plays)).toEqual(["1", "3", "2"]);
  });

  test("everything at once still ends at ESPN's list", () => {
    const before = [play("1"), play("2"), play("3"), play("4"), play("5")];
    const after = [play("6"), play("5"), play("1", "revised"), play("3"), play("7")];

    expect(follow(before, after).plays).toEqual(after);
  });
});

describe("reading a message off the socket", () => {
  test("a Game Stream message is parsed", () => {
    const message: GameStreamMessage = { type: "play-added", index: 0, play: play("1") };

    expect(parseGameStreamMessage(JSON.stringify(message))).toEqual(message);
  });

  test("the Agents SDK's own messages, and anything else, are null", () => {
    expect(
      parseGameStreamMessage(JSON.stringify({ type: "cf_agent_state", state: {} })),
    ).toBeNull();
    expect(parseGameStreamMessage("not json")).toBeNull();
    expect(parseGameStreamMessage(new ArrayBuffer(4))).toBeNull();
  });
});
