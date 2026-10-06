import { isKeyPlay } from "@yogan-hockey/schemas";
import { describe, expect, test } from "vitest";
import { endpoints } from "./endpoints.ts";
import { EspnParseError } from "./errors.ts";
import { loadFixture } from "./fixtures.ts";
import { translateGameSummary } from "./summary.ts";

/** Dallas at Buffalo, 2026-04-15: Dallas won 4-3 in a shootout. */
const FINISHED = "401803652";
/** Nashville at Toronto, 2026-10-06, recorded five hours before the start. */
const SCHEDULED = "401892449";

type Recorded = {
  plays?: { id: string; sequenceNumber: string }[];
  pickcenter?: { provider: { name: string } }[];
};
const recorded = (gameId: string) => loadFixture(endpoints.summary(gameId)) as Promise<Recorded>;
const finished = async () => translateGameSummary(await recorded(FINISHED), FINISHED);
const scheduled = async () => translateGameSummary(await recorded(SCHEDULED), SCHEDULED);

describe("the header of a finished game", () => {
  test("is the game, in the shape of any other game, with each side's shots", async () => {
    const { header } = await finished();

    expect(header).toMatchObject({
      id: "401803652",
      startTime: "2026-04-15T23:00:00.000Z",
      season: 2026,
      seasonType: 2,
      status: "final",
      detail: "Final/SO",
      clock: "0:00",
      venue: "KeyBank Center",
      home: {
        id: "2",
        abbreviation: "BUF",
        name: "Buffalo Sabres",
        shortName: "Sabres",
        record: "50-23-9",
        shots: 24,
        logo: "https://a.espncdn.com/i/teamlogos/nhl/500/buf.png",
        logoDark: "https://a.espncdn.com/i/teamlogos/nhl/500-dark/buf.png",
      },
      away: { id: "9", abbreviation: "DAL", shots: 28 },
    });
  });

  test("has ESPN's final score, which the plays' running score never reaches", async () => {
    const { header, plays } = await finished();

    expect(header.home).toMatchObject({ score: 3, winner: false });
    expect(header.away).toMatchObject({ score: 4, winner: true });
    expect(plays.at(-1)).toMatchObject({ homeScore: 2, awayScore: 3 });
  });

  test("ended in the period of its last play: the shootout", async () => {
    const { header } = await finished();

    expect(header.period).toBe(5);
  });
});

describe("the plays of a finished game", () => {
  test("keep ESPN's list order", async () => {
    const espn = (await recorded(FINISHED)).plays ?? [];
    const { plays } = await finished();

    expect(plays).toHaveLength(307);
    expect(plays.map((play) => play.id)).toEqual(espn.map((play) => play.id));
  });

  test("keep the list's order where the sequence numbers disagree with it", async () => {
    const espn = structuredClone(await recorded(FINISHED));
    const [first, second] = (espn.plays ?? []).splice(0, 2).toReversed();
    espn.plays = [first, second].flatMap((play) => play ?? []);
    expect(espn.plays.map((play) => play.sequenceNumber)).toEqual(["3", "2"]);

    const { plays } = translateGameSummary(espn, FINISHED);

    expect(plays.map((play) => play.id)).toEqual(espn.plays.map((play) => play.id));
  });

  test("a goal has its scorer and assists, strength, coordinate and the score after it", async () => {
    const { plays } = await finished();

    expect(plays.find((play) => play.scoring)).toEqual({
      id: "401803652000000780",
      type: "goal",
      typeText: "Goal",
      period: 1,
      periodText: "1st",
      clock: "2:19",
      text: "Mavrik Bourque Goal (20) Snap Shot, assists: Esa Lindell (26), Ilya Lyubushkin (8)",
      teamId: "9",
      coordinate: { x: -87, y: 7 },
      scoring: true,
      penalty: false,
      homeScore: 0,
      awayScore: 1,
      strength: "even-strength",
      wallclock: "2026-04-15T23:10:03.000Z",
      participants: [
        { athleteId: "4697413", name: "Mavrik Bourque", shortName: "M. Bourque", role: "scorer" },
        { athleteId: "3069352", name: "Esa Lindell", shortName: "E. Lindell", role: "assister" },
        {
          athleteId: "4342107",
          name: "Ilya Lyubushkin",
          shortName: "I. Lyubushkin",
          role: "assister",
        },
      ],
    });
  });

  test("a penalty is flagged, whatever ESPN calls the infraction", async () => {
    const { plays } = await finished();

    expect(plays.filter((play) => play.penalty).map((play) => play.typeText)).toEqual([
      "High-sticking",
      "Holding",
      "Interference",
      "Holding",
      "Delaying Game - Puck over Glass",
      "Hooking",
    ]);
    expect(plays.find((play) => play.penalty)).toMatchObject({
      type: "High-sticking",
      text: "Radek Faksa High-sticking against Josh Norris",
      teamId: "9",
      participants: [
        { name: "Radek Faksa", role: null },
        { name: "Josh Norris", role: null },
      ],
    });
  });

  test("a play of a type ESPN gives no abbreviation is named from its wording", async () => {
    const { plays } = await finished();

    expect(plays.at(-1)).toMatchObject({ type: "end-of-game", typeText: "End of Game" });
  });

  test("a period start has no team, coordinate or participants", async () => {
    const { plays } = await finished();

    expect(plays[0]).toMatchObject({
      id: "401803652000000520",
      type: "period-start",
      text: "Start of 1st Period",
      teamId: null,
      coordinate: null,
      participants: [],
    });
  });

  test("the key plays are the goals, penalties, shots on goal and period starts and ends", async () => {
    const { plays } = await finished();
    const count = (type: string) => plays.filter((play) => play.typeText === type).length;

    const keyPlays = plays.filter(isKeyPlay);

    // 11 goals (five of them in the shootout), 47 shots, 5 period starts, 5 ends, 6 penalties.
    expect([count("Goal"), count("Shot"), count("Period Start"), count("Period End")]).toEqual([
      11, 47, 5, 5,
    ]);
    expect(keyPlays).toHaveLength(74);
    expect([...new Set(keyPlays.map((play) => play.typeText))].toSorted()).toEqual([
      "Delaying Game - Puck over Glass",
      "Goal",
      "High-sticking",
      "Holding",
      "Hooking",
      "Interference",
      "Period End",
      "Period Start",
      "Shot",
    ]);
  });

  test("match the snapshot", async () => {
    expect(await finished()).toMatchSnapshot();
  });
});

describe("a scheduled game", () => {
  test("has a header with no score, shots or period, and no plays", async () => {
    const { header, plays } = await scheduled();

    expect(header).toMatchObject({
      id: "401892449",
      startTime: "2026-10-06T23:00:00.000Z",
      season: 2027,
      status: "scheduled",
      period: 0,
      clock: "0:00",
      home: { abbreviation: "TOR", score: 0, shots: 0, winner: false, record: "1-2-0" },
      away: { abbreviation: "NSH", score: 0, shots: 0, winner: false, record: "1-1-0" },
      venue: "Scotiabank Arena",
      broadcasts: ["ESPN+", "Scripps Sports"],
    });
    expect(plays).toEqual([]);
  });

  test("says which team is home, with each one's record and place in its division", async () => {
    const { pregame } = await scheduled();

    expect(pregame.home).toMatchObject({
      teamId: "21",
      record: { overall: "1-2-0", home: "1-2-0", road: null },
      standing: {
        position: 7,
        division: "Atlantic Division",
        wins: 1,
        losses: 2,
        otLosses: 0,
        points: 2,
      },
    });
    expect(pregame.away).toMatchObject({
      teamId: "27",
      record: { overall: "1-1-0", home: null, road: "0-0-0" },
      standing: { position: 5, division: "Central Division" },
    });
  });

  test("has each team's last five games, oldest first, from that team's side", async () => {
    const { pregame } = await scheduled();

    expect(pregame.home.lastFive).toHaveLength(5);
    expect(pregame.home.lastFive.at(-1)).toEqual({
      gameId: "401892434",
      startTime: "2026-10-03T23:00:00.000Z",
      home: true,
      opponent: { id: "14", abbreviation: "OTT", name: "Ottawa Senators" },
      result: "L",
      goalsFor: 2,
      goalsAgainst: 3,
    });
    // Toronto won 4-2 in Ottawa.
    expect(pregame.home.lastFive[0]).toMatchObject({
      home: false,
      result: "W",
      goalsFor: 4,
      goalsAgainst: 2,
    });
    // ESPN words this one "vs", but it was played in Carolina.
    expect(pregame.away.lastFive[1]).toMatchObject({
      gameId: "401879934",
      home: false,
      opponent: { abbreviation: "CAR" },
      result: "L",
      goalsFor: 5,
      goalsAgainst: 6,
    });
  });

  test("has the goalies, injuries and leaders of each team", async () => {
    const { pregame } = await scheduled();

    expect(pregame.home.goalies).toHaveLength(2);
    expect(pregame.home.goalies[0]).toEqual({
      athleteId: "5571",
      name: "Sergei Bobrovsky",
      gamesPlayed: 2,
      wins: 0,
      losses: 2,
      otLosses: 0,
      goalsAgainstAverage: 3.06,
      savePct: 0.887,
      shutouts: 0,
    });
    expect(pregame.away.goalies.map((goalie) => goalie.name)).toEqual(["Juuse Saros"]);
    expect(pregame.home.injuries[1]).toEqual({
      athleteId: "3042014",
      name: "Max Domi",
      position: "C",
      status: "Injured Reserve",
      type: "Back",
      detail: "Surgery",
      returnDate: "2026-11-21",
    });
    expect(pregame.home.leaders).toEqual([
      {
        category: "goals",
        athleteId: "3114736",
        name: "William Nylander",
        position: "RW",
        value: 2,
      },
      { category: "assists", athleteId: "2976833", name: "Morgan Rielly", position: "D", value: 3 },
      {
        category: "points",
        athleteId: "3114736",
        name: "William Nylander",
        position: "RW",
        value: 3,
      },
    ]);
  });

  test("has the season series, this game included", async () => {
    const { pregame } = await scheduled();

    expect(pregame.seasonSeries).toEqual({
      summary: "Series starts 10/6",
      games: [
        {
          gameId: "401892449",
          startTime: "2026-10-06T23:00:00.000Z",
          status: "scheduled",
          home: { teamId: "21", abbreviation: "TOR", score: 0 },
          away: { teamId: "27", abbreviation: "NSH", score: 0 },
        },
        {
          gameId: "401893348",
          startTime: "2027-02-19T01:00:00.000Z",
          status: "scheduled",
          home: { teamId: "27", abbreviation: "NSH", score: 0 },
          away: { teamId: "21", abbreviation: "TOR", score: 0 },
        },
      ],
    });
  });

  test("matches the snapshot", async () => {
    expect(await scheduled()).toMatchSnapshot();
  });
});

describe("a finished game's season series", () => {
  test("has the results of the games played", async () => {
    const { pregame } = await finished();

    expect(pregame.seasonSeries?.summary).toBe("Series tied 1-1");
    expect(pregame.seasonSeries?.games.at(-1)).toMatchObject({
      gameId: "401803652",
      status: "final",
      home: { abbreviation: "BUF", score: 3 },
      away: { abbreviation: "DAL", score: 4 },
    });
  });
});

describe("betting lines", () => {
  /** Every key anywhere inside a value. */
  function keysOf(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(keysOf);
    if (value === null || typeof value !== "object") return [];
    return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
  }

  test.each([
    ["a scheduled game", SCHEDULED],
    ["a finished game", FINISHED],
  ])("are in ESPN's summary of %s and not in ours", async (_name, gameId) => {
    const espn = await recorded(gameId);
    const provider = espn.pickcenter?.[0]?.provider.name;
    const ours = translateGameSummary(espn, gameId);

    // ESPN did send them, by a provider whose name would show if any of it leaked.
    expect(keysOf(espn)).toEqual(expect.arrayContaining(["pickcenter", "moneyline", "spread"]));
    expect(provider).toEqual(expect.any(String));

    const betting = /odds|spread|money|overunder|pickcenter|wager|bet|favorite|underdog/i;
    expect(keysOf(ours).filter((key) => betting.test(key))).toEqual([]);
    expect(JSON.stringify(ours)).not.toContain(provider);
  });
});

describe("a response that is not a game summary", () => {
  test("is a parse error naming the endpoint", () => {
    const parse = () => translateGameSummary({ header: { id: "1" } }, "1");

    expect(parse).toThrow(EspnParseError);
    expect(parse).toThrow(/ESPN summary\?event=1 did not parse/);
  });

  test("so is one without a home and an away team", async () => {
    const espn = structuredClone(await recorded(SCHEDULED)) as {
      header: { competitions: { competitors: unknown[] }[] };
    };
    espn.header.competitions[0]?.competitors.pop();

    expect(() => translateGameSummary(espn, SCHEDULED)).toThrow(
      /ESPN summary\?event=401892449 did not parse: header\.competitions\.0\.competitors/,
    );
  });
});
