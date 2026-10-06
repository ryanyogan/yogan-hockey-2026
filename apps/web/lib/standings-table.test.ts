import { getStandings } from "@yogan-hockey/espn";
import { type StandingsTable, type StandingsView, standingsView } from "@yogan-hockey/schemas";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  conferenceLabel,
  formatGoalDifference,
  goalDifferenceTone,
  playoffLine,
  tablesByConference,
} from "./standings-table";

beforeEach(() => {
  vi.stubEnv("ESPN_FIXTURES", "1");
});

/** The tables of a view of the recorded standings. */
async function tables(view: StandingsView): Promise<StandingsTable[]> {
  return standingsView(await getStandings(), view);
}

describe("a goal difference", () => {
  it("carries its sign", () => {
    expect(formatGoalDifference(5)).toBe("+5");
    expect(formatGoalDifference(-12)).toBe("-12");
  });

  it("is a bare 0 when level", () => {
    expect(formatGoalDifference(0)).toBe("0");
  });

  it("is coloured by its sign, and not at all when level", () => {
    expect(goalDifferenceTone(1)).toBe("positive");
    expect(goalDifferenceTone(-1)).toBe("negative");
    expect(goalDifferenceTone(0)).toBe("default");
  });
});

describe("the playoff line", () => {
  it("falls under the second wild card, and nowhere in the tables of division leaders", async () => {
    expect((await tables("wildcard")).map((table) => [table.title, playoffLine(table)])).toEqual([
      ["Atlantic Division", null],
      ["Metropolitan Division", null],
      ["Wild Card", 2],
      ["Central Division", null],
      ["Pacific Division", null],
      ["Wild Card", 2],
    ]);
  });

  it("falls under the third team of a division", async () => {
    expect((await tables("division")).map(playoffLine)).toEqual([3, 3, 3, 3]);
  });

  it("is not drawn in the conference and league views", async () => {
    expect((await tables("conference")).map(playoffLine)).toEqual([null, null]);
    expect((await tables("league")).map(playoffLine)).toEqual([null]);
  });
});

describe("the conference named beside a table's title", () => {
  it("tells one wild card table, or one division, from the other conference's", async () => {
    expect((await tables("wildcard")).map(conferenceLabel)).toEqual([
      "East",
      "East",
      "East",
      "West",
      "West",
      "West",
    ]);
  });

  it("is left out where the title is the conference, or the league", async () => {
    expect((await tables("conference")).map(conferenceLabel)).toEqual([undefined, undefined]);
    expect((await tables("league")).map(conferenceLabel)).toEqual([undefined]);
  });
});

describe("the columns of a view", () => {
  const titles = async (view: StandingsView) =>
    tablesByConference(await tables(view)).map((column) => column.map((table) => table.title));

  it("puts each conference's tables in a column of their own, in order", async () => {
    expect(await titles("wildcard")).toEqual([
      ["Atlantic Division", "Metropolitan Division", "Wild Card"],
      ["Central Division", "Pacific Division", "Wild Card"],
    ]);
    expect(await titles("division")).toEqual([
      ["Atlantic Division", "Metropolitan Division"],
      ["Central Division", "Pacific Division"],
    ]);
    expect(await titles("conference")).toEqual([["Eastern Conference"], ["Western Conference"]]);
  });

  it("is one column for the league", async () => {
    expect(await titles("league")).toEqual([["National Hockey League"]]);
  });
});
