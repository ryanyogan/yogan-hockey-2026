import {
  PlayerCareerSchema,
  PlayerGameLogSchema,
  PlayerProfileSchema,
  type RosterPlayer,
} from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import { LEGEND_ID, legendPlayer, rosterWithLegend } from "./legend";
import { careerView, seasonView } from "./player-view";

const NYLANDER: RosterPlayer = {
  id: "3114736",
  name: "William Nylander",
  jersey: "88",
  position: "RW",
  headshot: null,
};

test("his id is one ESPN, whose ids are digits, can never give a player", () => {
  expect(LEGEND_ID).not.toMatch(/^\d+$/);
});

test("he is a player in the shapes ESPN's players come in", () => {
  const player = legendPlayer();

  expect(PlayerProfileSchema.parse(player.profile)).toEqual(player.profile);
  expect(PlayerCareerSchema.parse(player.career)).toEqual(player.career);
  expect(PlayerGameLogSchema.parse(player.gameLog)).toEqual(player.gameLog);
  expect(player.profile.headshot).toBeNull();
});

test("his age follows from his birth date", () => {
  const before = legendPlayer(new Date("2026-09-08T12:00:00Z")).profile;
  const after = legendPlayer(new Date("2026-09-09T12:00:00Z")).profile;

  expect(before.birthDate).toBe("1999-09-09");
  expect(before.age).toBe(26);
  expect(after.age).toBe(27);
});

test("his season is 45 games, 58 goals, 89 assists and 147 points, first in the league", () => {
  const { profile, career, gameLog } = legendPlayer();

  const season = seasonView(profile, career, gameLog);

  expect(season?.season).toBe("2026-27");
  expect(season?.stats).toEqual([
    { label: "GP", value: "45", rank: null },
    { label: "G", value: "58", rank: "1st" },
    { label: "A", value: "89", rank: "1st" },
    { label: "PTS", value: "147", rank: "1st" },
    { label: "PIM", value: "12", rank: null },
    { label: "+/-", value: "+67", rank: "1st" },
  ]);
});

test("his career is eleven seasons in Toronto, newest first, with their totals", () => {
  const career = careerView(legendPlayer().career);

  expect(career?.seasonCount).toBe(11);
  expect(career?.columns.map((column) => column.label)).toEqual([
    "GP",
    "G",
    "A",
    "PTS",
    "+/-",
    "PIM",
  ]);
  expect(career?.rows.map((row) => row.team?.abbreviation)).toEqual(Array(11).fill("TOR"));
  expect(career?.rows[0]).toMatchObject({
    season: "26-27",
    values: ["45", "58", "89", "147", "+67", "12"],
  });
  expect(career?.rows[1]).toMatchObject({
    season: "25-26",
    values: ["82", "98", "152", "250", "+111", "22"],
  });
  expect(career?.rows[10]).toMatchObject({
    season: "16-17",
    values: ["38", "78", "67", "145", "+72", "0"],
  });
  expect(career?.totals).toEqual(["608", "1,013", "1,286", "2,299", "+1,097", "114"]);
  expect(career?.headline).toEqual([
    { label: "GP", value: "608" },
    { label: "G", value: "1,013" },
    { label: "A", value: "1,286" },
    { label: "PTS", value: "2,299" },
    { label: "P/GP", value: "3.78" },
  ]);
});

test("he is put at the top of Toronto's roster, ahead of every number", () => {
  const roster = rosterWithLegend("21", [NYLANDER]);

  expect(roster).toHaveLength(2);
  expect(roster[0]).toEqual({
    id: LEGEND_ID,
    name: "Rylan Yogan",
    jersey: "99",
    position: "C",
    headshot: null,
  });
  expect(roster[1]).toBe(NYLANDER);
});

test("no other team's roster has him", () => {
  expect(rosterWithLegend("10", [NYLANDER])).toEqual([NYLANDER]);
});
