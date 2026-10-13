import { describe, expect, it } from "vitest";
import type { Call } from "./picks-figures";
import {
  bandLabel,
  callGameId,
  callSentence,
  noFigures,
  record,
  runWords,
  share,
  weekLabel,
  weekSpan,
} from "./picks-page-copy";

/** The words without the word joiners that keep a score on one line. */
const plain = (text: string) => text.replaceAll("\u2060", "");

const call: Call = {
  gameId: "401",
  date: "2026-10-05",
  picked: { id: "7", abbreviation: "CAR", name: "Carolina Hurricanes" },
  opponent: { id: "15", abbreviation: "PHI", name: "Philadelphia Flyers" },
  pickedHome: false,
  winProbability: 78,
  score: { picked: 4, opponent: 1 },
};

describe("the Picks page's words", () => {
  it("name the week shown: this one, or the latest with a result", () => {
    const week = { start: "2026-10-05", end: "2026-10-11" };
    expect(weekLabel({ current: true })).toBe("This week in figures");
    expect(weekLabel({ current: false })).toBe("The latest week in figures");
    expect(weekSpan(week)).toBe("Mon Oct 5 to Sun Oct 11");
  });

  it("print a record with an en dash and its share whole, and no share of nothing", () => {
    expect(plain(record({ right: 29, wrong: 14 }))).toBe("29–14");
    expect(record({ right: 29, wrong: 14 })).toBe("29\u2060–\u206014");
    expect(share({ right: 2, wrong: 1 })).toBe("67%");
    expect(share({ right: 0, wrong: 0 })).toBe("");
  });

  it("say the run and the bands", () => {
    expect(runWords({ outcome: "wrong", length: 2 })).toEqual({
      figure: "2",
      key: "wrong in a row",
    });
    expect(bandLabel({ from: 50, to: 54 })).toBe("50–54%");
    expect(bandLabel({ from: 65, to: null })).toBe("65% and up");
  });

  it("write a call that came in and one that did not, the winner's score first", () => {
    expect(plain(callSentence(call))).toBe(
      "The Carolina Hurricanes, picked at 78% on the road, beat the Philadelphia Flyers 4–1 on Monday.",
    );
    expect(
      plain(
        callSentence({
          ...call,
          pickedHome: true,
          winProbability: 62.6,
          score: { picked: 3, opponent: 5 },
        }),
      ),
    ).toBe(
      "The Carolina Hurricanes, picked at 63% at home, lost 5–3 to the Philadelphia Flyers on Monday.",
    );
  });

  it("say there are no figures yet, and how many picks are waiting", () => {
    expect(noFigures(0)).toBe(
      "No pick has been decided yet this season. The figures start with the first final.",
    );
    expect(noFigures(1)).toContain("One pick is waiting on its game.");
    expect(noFigures(9)).toContain("9 picks are waiting on their games.");
  });
});

it("a call links to its game where the game is ESPN's, and to nothing where it is a sample's", () => {
  expect(callGameId({ gameId: "401892449" })).toBe("401892449");
  expect(callGameId({ gameId: "sample-pick-4" })).toBeNull();
});
