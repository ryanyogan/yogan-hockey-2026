import { describe, expect, test } from "vitest";
import { endpoints } from "./endpoints.ts";
import { EspnParseError } from "./errors.ts";
import { loadFixture } from "./fixtures.ts";
import {
  translatePlayer,
  translatePlayerCareer,
  translatePlayerGameLog,
  translatePlayerSearch,
} from "./player.ts";

/** Auston Matthews, a centre. */
const SKATER = "4024123";
/** Anthony Stolarz, a goalie who has played for five clubs. */
const GOALIE = "3067313";

describe("a player's profile", () => {
  const profile = async (id: string) =>
    translatePlayer(await loadFixture(endpoints.player(id)), id);

  test("has who he is and the club he plays for", async () => {
    expect(await profile(SKATER)).toMatchObject({
      id: "4024123",
      name: "Auston Matthews",
      firstName: "Auston",
      lastName: "Matthews",
      jersey: "34",
      position: "C",
      positionName: "Center",
      headshot: "https://a.espncdn.com/i/headshots/nhl/players/full/4024123.png",
      team: {
        id: "21",
        abbreviation: "TOR",
        name: "Toronto Maple Leafs",
        logo: "https://a.espncdn.com/i/teamlogos/nhl/500/tor.png",
      },
      height: `6' 3"`,
      weight: "214 lbs",
      birthDate: "1997-09-17",
      age: 29,
      birthPlace: "San Ramon, CA",
      draft: "2016: Rd 1, Pk 1 (TOR)",
      experience: "11th Season",
      hand: "Left",
      active: true,
    });
  });

  test("has no birth date when ESPN's is not a real day written day first", async () => {
    const espn = structuredClone(await loadFixture(endpoints.player(SKATER))) as {
      athlete: { displayDOB: string };
    };

    espn.athlete.displayDOB = "9/17/1997";
    expect(translatePlayer(espn, SKATER).birthDate).toBeNull();
    espn.athlete.displayDOB = "31/2/1997";
    expect(translatePlayer(espn, SKATER).birthDate).toBeNull();
  });

  test("has a skater's season summary: goals, assists, points and plus-minus", async () => {
    const { seasonSummary } = await profile(SKATER);

    expect(seasonSummary).toEqual({
      title: "2026-27 regular season stats",
      stats: [
        { name: "goals", label: "G", value: "1", rank: "Tied-47th" },
        { name: "assists", label: "A", value: "0", rank: "Tied-281st" },
        { name: "points", label: "PTS", value: "1", rank: "Tied-195th" },
        { name: "plusMinus", label: "+/-", value: "-1", rank: "Tied-407th" },
      ],
    });
  });

  test("has a goalie's season summary: his record, goals against, save percentage and shutouts", async () => {
    const { position, seasonSummary } = await profile(GOALIE);

    expect(position).toBe("G");
    expect(seasonSummary?.stats).toEqual([
      {
        name: "wins-losses-overtimeLosses",
        label: "WINS-L-OTL",
        value: "1-0-0",
        rank: "Tied-12th",
      },
      { name: "avgGoalsAgainst", label: "GAA", value: "1.03", rank: "8th" },
      { name: "savePct", label: "SV%", value: ".963", rank: "5th" },
      { name: "shutouts", label: "SO", value: "0", rank: "Tied-9th" },
    ]);
  });

  test("matches the snapshot, skater and goalie", async () => {
    expect(await profile(SKATER)).toMatchSnapshot();
    expect(await profile(GOALIE)).toMatchSnapshot();
  });

  test("a response that is not an athlete is a parse error naming the endpoint", () => {
    const parse = () => translatePlayer({ athlete: { id: 4024123 } }, SKATER);

    expect(parse).toThrow(EspnParseError);
    expect(parse).toThrow(/ESPN athletes\/4024123 did not parse/);
  });
});

describe("a player's career", () => {
  const career = async (id: string) =>
    translatePlayerCareer(await loadFixture(endpoints.playerCareer(id)), id);

  test("is a row per season, oldest first, under a skater's columns, with totals", async () => {
    const { playerId, columns, seasons, totals } = await career(SKATER);

    expect(playerId).toBe("4024123");
    expect(columns.map((column) => column.label)).toEqual([
      "GP",
      "G",
      "A",
      "PTS",
      "+/-",
      "PIM",
      "SOG",
      "SPCT",
      "PPG",
      "PPA",
      "SHG",
      "SHA",
      "GWG",
      "TOI/G",
      "PROD",
    ]);
    expect(columns[0]).toEqual({ name: "games", label: "GP" });
    expect(seasons).toHaveLength(11);
    expect(seasons[0]).toEqual({
      year: 2017,
      season: "16-17",
      team: { id: "21", abbreviation: "TOR", name: "Toronto Maple Leafs" },
      values: [
        "82",
        "40",
        "29",
        "69",
        "2",
        "14",
        "2",
        "14.3",
        "8",
        "13",
        "0",
        "0",
        "8",
        "17:37",
        "20:57",
      ],
    });
    expect(seasons.at(-1)).toMatchObject({ year: 2027, season: "26-27" });
    expect(totals.slice(0, 4)).toEqual(["692", "429", "352", "781"]);
  });

  test("has a goalie's columns for a goalie, and each club he played for", async () => {
    const { columns, seasons, totals } = await career(GOALIE);

    expect(columns.map((column) => column.label)).toEqual([
      "GP",
      "GS",
      "TOI/G",
      "WINS",
      "L",
      "T",
      "OTL",
      "GA",
      "GAA",
      "SA",
      "SV",
      "SV%",
      "SO",
    ]);
    expect(seasons).toHaveLength(12);
    const clubs = seasons.flatMap((season) => season.team?.abbreviation ?? []);
    expect([...new Set(clubs)].toSorted()).toEqual(["ANA", "EDM", "FLA", "PHI", "TOR"]);
    // 2018-19, split between Edmonton and Philadelphia, has a third row that totals the two.
    expect(seasons.filter((season) => season.year === 2019).map((season) => season.team)).toEqual([
      { id: "6", abbreviation: "EDM", name: "Edmonton Oilers" },
      { id: "15", abbreviation: "PHI", name: "Philadelphia Flyers" },
      null,
    ]);
    expect(totals).toEqual([
      "169",
      "142",
      "53:27",
      "75",
      "49",
      "0",
      "15",
      "399",
      "2.65",
      "4627",
      "4229",
      ".914",
      "12",
    ]);
  });

  test("every row and the totals have a value for every column", async () => {
    for (const id of [SKATER, GOALIE]) {
      const { columns, seasons, totals } = await career(id);

      expect(totals).toHaveLength(columns.length);
      expect(seasons.filter((season) => season.values.length !== columns.length)).toEqual([]);
    }
  });

  test("a player with no NHL seasons has an empty table", () => {
    expect(translatePlayerCareer({ categories: [] }, SKATER)).toEqual({
      playerId: "4024123",
      columns: [],
      seasons: [],
      totals: [],
    });
  });

  test("matches the snapshot, skater and goalie", async () => {
    expect(await career(SKATER)).toMatchSnapshot();
    expect(await career(GOALIE)).toMatchSnapshot();
  });

  test("a response that is not a stats table is a parse error naming the endpoint", () => {
    const parse = () => translatePlayerCareer({ categories: [{ statistics: "none" }] }, SKATER);

    expect(parse).toThrow(EspnParseError);
    expect(parse).toThrow(/ESPN athletes\/4024123\/stats did not parse/);
  });
});

describe("a player's game log", () => {
  const gameLog = async (id: string) =>
    translatePlayerGameLog(await loadFixture(endpoints.playerGameLog(id)), id);

  test("is his games this season, newest first, each with the result and his line", async () => {
    const { season, columns, games } = await gameLog(SKATER);

    expect(season).toBe("2026-27 Regular Season");
    expect(columns).toHaveLength(14);
    expect(columns.slice(0, 6).map((column) => column.label)).toEqual([
      "G",
      "A",
      "PTS",
      "+/-",
      "PIM",
      "S",
    ]);
    expect(games.map((game) => game.gameId)).toEqual(["401892434", "401892431", "401891827"]);
    expect(games[0]).toEqual({
      gameId: "401892434",
      startTime: "2026-10-03T23:00:00.000Z",
      home: true,
      opponent: { id: "14", abbreviation: "OTT", name: "Ottawa Senators" },
      result: "L",
      goalsFor: 2,
      goalsAgainst: 3,
      values: ["1", "0", "1", "1", "0", "6", "16.7", "0", "0", "0", "0", "0", "21:50", "21:50"],
    });
  });

  test("has a goalie's columns for a goalie", async () => {
    const { columns, games } = await gameLog(GOALIE);

    expect(columns.map((column) => column.name)).toContain("savePct");
    expect(games).toHaveLength(1);
    expect(games[0]?.values).toHaveLength(columns.length);
  });

  test("a player who has not played this season has no games", () => {
    expect(translatePlayerGameLog({}, SKATER)).toEqual({
      playerId: "4024123",
      season: null,
      columns: [],
      games: [],
    });
  });

  test("matches the snapshot, skater and goalie", async () => {
    expect(await gameLog(SKATER)).toMatchSnapshot();
    expect(await gameLog(GOALIE)).toMatchSnapshot();
  });

  test("a response that is not a game log is a parse error naming the endpoint", () => {
    const parse = () => translatePlayerGameLog({ seasonTypes: "regular" }, SKATER);

    expect(parse).toThrow(EspnParseError);
    expect(parse).toThrow(/ESPN athletes\/4024123\/gamelog did not parse/);
  });
});

describe("a player search", () => {
  const recorded = () => loadFixture(endpoints.playerSearch("mar")) as Promise<{ items: object[] }>;

  test("is the players ESPN found, each with his club", async () => {
    const players = translatePlayerSearch(await recorded(), "mar");

    expect(players.map((player) => player.name)).toEqual([
      "Brad Marchand",
      "Mason Marchment",
      "Martin Necas",
      "Mario Ferraro",
      "Kirill Marchenko",
      "Mark Kastelic",
      "Mark Stone",
      "Marc Gatcomb",
      "Mitch Marner",
      "Jacob Markstrom",
    ]);
    expect(players[0]).toEqual({
      id: "3852",
      name: "Brad Marchand",
      jersey: "63",
      position: "LW",
      headshot: "https://a.espncdn.com/i/headshots/nhl/players/full/3852.png",
      team: { id: "26", abbreviation: "FLA", name: "Florida Panthers" },
    });
  });

  test("is never more than ten, and players of the NHL only", async () => {
    const { items } = await recorded();
    const [marchand] = items;
    const response = {
      items: [
        { ...marchand, id: "1", type: "team" },
        { ...marchand, id: "2", league: "ahl" },
        ...items,
        { ...marchand, id: "3" },
      ],
    };

    const players = translatePlayerSearch(response, "mar");

    // The team and the AHL player are dropped, and the eleventh NHL player is one too many.
    expect(players.map((player) => player.id)).toEqual([
      "3852",
      "4272192",
      "4233586",
      "4233884",
      "4587996",
      "4587985",
      "5545",
      "5103547",
      "3899937",
      "5452",
    ]);
  });

  test("that finds nobody is an empty list", () => {
    // What ESPN answers for a query that matches nothing.
    const nothing = { count: 0, pageIndex: 0, pageSize: 5, pageCount: 0, items: [] };

    expect(translatePlayerSearch(nothing, "zzzzqqq")).toEqual([]);
  });

  test("matches the snapshot", async () => {
    expect(translatePlayerSearch(await recorded(), "mar")).toMatchSnapshot();
  });

  test("a response that is not a search result is a parse error naming the endpoint", () => {
    const parse = () => translatePlayerSearch({ items: [{ id: 3852 }] }, "mar");

    expect(parse).toThrow(EspnParseError);
    expect(parse).toThrow(/ESPN search did not parse/);
  });
});
