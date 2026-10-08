import { expect, test } from "vitest";
import {
  careerOf,
  familyRow,
  headerOf,
  scheduleOf,
  seasonOf,
  trackedPlayer,
  trackedPlayerHref,
  trackedPlayers,
  trackedTabFrom,
} from "./tracked-players";
import { stillToCome } from "./tracked-schedule";

const rylan = () => {
  const player = trackedPlayer("rylan");
  if (!player) throw new Error("no file for rylan");
  return player;
};

test("Rylan is a Tracked Player, read from his file", () => {
  expect(rylan().name).toBe("Rylan Yogan");
  expect(trackedPlayers().map((player) => player.slug)).toEqual(["rylan"]);
});

test("a slug with no file is no Tracked Player", () => {
  expect(trackedPlayer("nobody")).toBeNull();
  expect(trackedPlayer("../rylan")).toBeNull();
});

test("his club is its name and nothing more", () => {
  expect(rylan().team).toEqual({ name: "Chicago Falcons" });
});

test("each tab has one address, and Stats is the page itself", () => {
  expect(trackedPlayerHref("rylan")).toBe("/family/rylan");
  expect(trackedPlayerHref("rylan", "stats")).toBe("/family/rylan");
  expect(trackedPlayerHref("rylan", "schedule")).toBe("/family/rylan?tab=schedule");
});

test("a tab is read from the URL, and anything unknown is Stats", () => {
  expect(trackedTabFrom(undefined)).toBe("stats");
  expect(trackedTabFrom("schedule")).toBe("schedule");
  expect(trackedTabFrom("roster")).toBe("stats");
  expect(trackedTabFrom(["schedule", "stats"])).toBe("stats");
});

test("the header line names his position, number and club, then what else is known", () => {
  expect(headerOf(rylan())).toEqual({
    name: "Rylan Yogan",
    detail: "Center · #99 · Chicago Falcons",
    facts: [{ label: "shoots", value: "Right" }],
  });
});

test("a Tracked Player with a name alone has a header and nothing else", () => {
  const bare = { slug: "sam", name: "Sam Yogan" };

  expect(headerOf(bare)).toEqual({ name: "Sam Yogan", detail: null, facts: [] });
  expect(seasonOf(bare)).toBeNull();
  expect(careerOf(bare)).toBeNull();
  expect(scheduleOf(bare)).toBeNull();
  expect(familyRow(bare)).toEqual({
    slug: "sam",
    name: "Sam Yogan",
    href: "/family/sam",
    team: null,
    season: null,
    totals: [],
    lastGame: null,
  });
});

test("his season is one line of figures, unranked", () => {
  expect(seasonOf(rylan())).toEqual({
    season: "2026-27",
    stats: [
      { label: "GP", value: "6", rank: null },
      { label: "G", value: "44", rank: null },
      { label: "A", value: "35", rank: null },
      { label: "PTS", value: "79", rank: null },
      { label: "+/-", value: "+60", rank: null },
      { label: "PIM", value: "0", rank: null },
    ],
  });
});

test("his career is newest first, each season with its club, then the totals", () => {
  const career = careerOf(rylan());

  expect(career?.seasonCount).toBe(4);
  expect(career?.rows.map((row) => [row.season, row.club, row.team])).toEqual([
    ["26-27", "Chicago Falcons", null],
    ["25-26", "Chicago Falcons", null],
    ["24-25", "Chicago Falcons", null],
    ["23-24", "Chicago Falcons", null],
  ]);
  expect(career?.rows[0]?.values).toEqual(["6", "44", "35", "79", "+60", "0"]);
  expect(career?.totals).toEqual(["138", "824", "738", "1,562", "+1,229", "4"]);
  expect(career?.headline).toEqual([
    { label: "GP", value: "138" },
    { label: "G", value: "824" },
    { label: "A", value: "738" },
    { label: "PTS", value: "1,562" },
    { label: "P/GP", value: "11.32" },
  ]);
});

test("his schedule is the games to come, soonest first, and the games played, newest first", () => {
  const schedule = scheduleOf(rylan(), "2026-10-06");

  // Once a day has passed, a game still without a result is no longer upcoming.
  expect(scheduleOf(rylan(), "2026-10-17")?.upcoming.map((row) => row.date)).toEqual([
    "Oct 17",
    "Oct 18",
  ]);
  expect(scheduleOf(rylan(), "2027-01-01")?.upcoming).toEqual([]);
  // A render gives no day (the page is cached): every game without a result is listed, keyed by
  // its ISO date, and the browser leaves out the ones that have passed.
  const all = scheduleOf(rylan())?.upcoming ?? [];
  expect(all.length).toBeGreaterThan(2);
  expect(stillToCome(all, "2026-10-17").map((row) => row.date)).toEqual(["Oct 17", "Oct 18"]);
  expect(stillToCome(all, "2027-01-01")).toEqual([]);
  expect(scheduleOf(rylan(), "2027-01-01")?.results).toHaveLength(6);

  expect(schedule?.season).toBe("2026-27");
  expect(schedule?.columns.map((column) => column.label)).toEqual(["G", "A", "PTS", "+/-", "SOG"]);
  expect(schedule?.upcoming).toEqual([
    { key: "2026-10-10", date: "Oct 10", opponent: "vs North Pole Blizzard" },
    { key: "2026-10-11", date: "Oct 11", opponent: "at Sasquatch Valley Stompers" },
    { key: "2026-10-17", date: "Oct 17", opponent: "vs Moon Base Comets" },
    { key: "2026-10-18", date: "Oct 18", opponent: "at Camelot Knights" },
  ]);
  expect(schedule?.results).toHaveLength(6);
  expect(schedule?.results[0]).toEqual({
    key: "2026-10-04",
    date: "Oct 4",
    opponent: "vs Loch Ness Monsters",
    result: "W 14-2",
    values: ["8", "5", "13", "+11", "9"],
  });
  expect(schedule?.results[5]?.opponent).toBe("at Atlantis Krakens");
});

test("the dashboard's Family row is his club, his season's totals and his last game", () => {
  expect(familyRow(rylan())).toEqual({
    slug: "rylan",
    name: "Rylan Yogan",
    href: "/family/rylan",
    team: "Chicago Falcons",
    season: "2026-27",
    totals: [
      { label: "GP", value: "6" },
      { label: "G", value: "44" },
      { label: "A", value: "35" },
      { label: "PTS", value: "79" },
    ],
    lastGame: "Oct 4 vs Loch Ness Monsters, W 14-2",
  });
});

test("his invented figures agree with each other", () => {
  const player = rylan();
  const log = player.gameLog;
  const played = log?.games.flatMap((game) => (game.played ? [game.played] : [])) ?? [];
  const sum = (name: string) => {
    const index = log?.columns.findIndex((column) => column.name === name) ?? -1;
    return played.reduce((total, game) => total + Number(game.values[index]), 0);
  };

  // The season's line is the game log added up, and is the career's newest row.
  expect([played.length, sum("goals"), sum("assists"), sum("points"), sum("plusMinus")]).toEqual([
    6, 44, 35, 79, 60,
  ]);
  expect(player.career?.seasons.at(-1)?.values).toEqual(player.currentSeason?.values);
  for (const game of played) {
    expect(Number(game.values[2])).toBeLessThanOrEqual(game.goalsFor);
  }
});
