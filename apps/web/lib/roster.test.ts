import type { RosterPlayer } from "@yogan-hockey/schemas";
import { describe, expect, it } from "vitest";
import { playerHref, sortRoster } from "./roster";

const player = (name: string, jersey: string | null): RosterPlayer => ({
  id: name,
  name,
  jersey,
  position: "C",
  headshot: null,
});

const names = (players: RosterPlayer[]) => players.map((each) => each.name);

describe("a roster's order", () => {
  it("is by jersey number, as numbers and not as text", () => {
    const roster = [player("Tavares", "91"), player("Blankenburg", "3"), player("Matthews", "34")];
    expect(names(sortRoster(roster))).toEqual(["Blankenburg", "Matthews", "Tavares"]);
  });

  it("puts a player without a number last", () => {
    const roster = [player("Callup", null), player("Tavares", "91"), player("Rielly", "44")];
    expect(names(sortRoster(roster))).toEqual(["Rielly", "Tavares", "Callup"]);
  });

  it("puts a number that is not one last too", () => {
    const roster = [player("Odd", "TBD"), player("Blank", ""), player("Tavares", "91")];
    expect(names(sortRoster(roster))).toEqual(["Tavares", "Odd", "Blank"]);
  });

  it("keeps ESPN's order between players it cannot tell apart", () => {
    const roster = [player("Second", null), player("First", null), player("Low", "1")];
    expect(names(sortRoster(roster))).toEqual(["Low", "Second", "First"]);
  });

  it("leaves the list it was given as it was", () => {
    const roster = [player("Tavares", "91"), player("Blankenburg", "3")];
    sortRoster(roster);
    expect(names(roster)).toEqual(["Tavares", "Blankenburg"]);
  });
});

describe("a player's page", () => {
  it("is addressed by ESPN's athlete id", () => {
    expect(playerHref({ id: "4024123" })).toBe("/players/4024123");
  });
});
