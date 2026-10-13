import { translateGameSummary, translateScoreboard, translateStandings } from "@yogan-hockey/espn";
import type { StoredPrediction } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import recordedSlate from "../../../../packages/espn/fixtures/scoreboard.json";
import recordedFinals from "../../../../packages/espn/fixtures/scoreboard-20261003.json";
import recordedStandings from "../../../../packages/espn/fixtures/standings.json";
import recordedSummary from "../../../../packages/espn/fixtures/summary-401803652.json";
import { dayBefore, dayName, easternDate, writingFacts } from "./facts";

const slate = translateScoreboard(recordedSlate, "2026-10-06").games;
const finals = translateScoreboard(recordedFinals, "2026-10-03").games;
const standings = translateStandings(recordedStandings);
const shootout = translateGameSummary(recordedSummary, "401803652");

const TORONTO = "21";
/** Nashville at Toronto, still to be played. */
const NSH_AT_TOR = "401892449";

function prediction(gameId: string, pickTeamId: string, winProbability: number): StoredPrediction {
  return {
    gameId,
    status: "made",
    pickTeamId,
    winProbability,
    reasoning: "Toronto is at home. Nashville is not.",
    keyFactors: [],
    madeAt: "2026-10-06T15:00:00.000Z",
    model: "@cf/openai/gpt-oss-120b",
    inputs: {},
  };
}

const facts = writingFacts({
  date: "2026-10-06",
  standings,
  finals: [
    { game: shootout.header, plays: shootout.plays },
    ...finals.slice(0, 2).map((game) => ({ game, plays: null })),
  ],
  slate: [...slate, ...finals],
  predictions: new Map([
    [NSH_AT_TOR, prediction(NSH_AT_TOR, TORONTO, 61.4)],
    // Buffalo, at home, was the pick; Dallas won.
    [shootout.header.id, prediction(shootout.header.id, shootout.header.home.id, 55)],
  ]),
});

test("every club of the standings is a team, with its row in words a piece can use", () => {
  expect(facts.teams).toHaveLength(32);
  expect(facts.teams[0]).toEqual({
    team: "OTT",
    name: "Ottawa Senators",
    city: "Ottawa",
    nickname: "Senators",
    record: "2-0-0",
    points: 4,
    division: "Atlantic Division",
    conference: "Eastern Conference",
    divisionPlace: "1st",
    streak: "won 2 in a row",
    homeRecord: "0-0-0",
    roadRecord: "2-0-0",
    lastTen: "2-0-0",
    goalsFor: 7,
    goalsAgainst: 3,
  });
});

test("a final carries its score, how it was decided, its goals in order, and how the pick did", () => {
  const [dallasAtBuffalo, , montrealAtPittsburgh] = facts.finals;

  expect(dallasAtBuffalo).toMatchObject({
    away: "DAL",
    home: "BUF",
    awayScore: 4,
    homeScore: 3,
    winner: "DAL",
    decidedIn: "a shootout",
    pick: { team: "BUF", winProbability: 55, outcome: "wrong" },
  });
  // Six goals in a game that ended 4-3: the shootout's attempts are not goals.
  expect(dallasAtBuffalo?.goals).toHaveLength(6);
  expect(dallasAtBuffalo?.goals?.[0]).toEqual({
    period: "1st",
    time: "2:19",
    team: "DAL",
    scorer: "Mavrik Bourque",
    assists: ["Esa Lindell", "Ilya Lyubushkin"],
  });
  expect(montrealAtPittsburgh).toMatchObject({ decidedIn: "overtime", goals: null, pick: null });
  expect(facts.finalsDay).toBe("Wednesday, April 15");
});

test("the slate is the games still to be played, each with the site's pick or none", () => {
  // The finished games handed in with the slate are not games to preview.
  expect(facts.slate).toHaveLength(slate.length);
  expect(facts.slate.find(({ game }) => game === NSH_AT_TOR)).toEqual({
    game: NSH_AT_TOR,
    away: "NSH",
    home: "TOR",
    start: "7:00 p.m. ET",
    venue: "Scotiabank Arena",
    pick: { team: "TOR", winProbability: 61 },
  });
  expect(facts.slate[0]?.pick).toBeNull();
});

test("a failed Prediction is no pick", () => {
  const failed: StoredPrediction = {
    gameId: NSH_AT_TOR,
    status: "failed",
    madeAt: "2026-10-06T15:00:00.000Z",
    model: "@cf/openai/gpt-oss-120b",
    inputs: {},
  };
  const without = writingFacts({
    date: "2026-10-06",
    standings,
    finals: [],
    slate,
    predictions: new Map([[NSH_AT_TOR, failed]]),
  });

  expect(without.slate.every(({ pick }) => pick === null)).toBe(true);
});

test("without the standings the teams are the ones playing, with the records their games carry", () => {
  const bare = writingFacts({
    date: "2026-10-06",
    standings: null,
    finals: [],
    slate,
    predictions: new Map(),
  });

  expect(bare.teams).toHaveLength(slate.length * 2);
  const toronto = bare.teams.find(({ team }) => team === "TOR");
  expect(toronto).toEqual({
    team: "TOR",
    name: "Toronto Maple Leafs",
    city: "Toronto",
    nickname: "Maple Leafs",
    record: slate.find(({ id }) => id === NSH_AT_TOR)?.home.record,
  });
});

test("nothing ESPN sends beyond the named fields reaches the facts", () => {
  const sent = JSON.stringify(facts);
  for (const never of ["broadcast", "ESPN+", "logo", "http", "odds", "injur"]) {
    expect(sent).not.toContain(never);
  }
});

test("the NHL's day is Eastern time's", () => {
  expect(easternDate(Date.parse("2026-10-13T03:30:00Z"))).toBe("2026-10-12");
  expect(easternDate(Date.parse("2026-10-13T04:30:00Z"))).toBe("2026-10-13");
  expect(dayBefore("2026-10-01")).toBe("2026-09-30");
  expect(dayName("2026-10-12")).toBe("Monday, October 12");
});
