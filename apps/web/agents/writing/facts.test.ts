import { translateGameSummary, translateScoreboard, translateStandings } from "@yogan-hockey/espn";
import type { Game, SeasonPick, StoredPrediction } from "@yogan-hockey/schemas";
import { expect, test, vi } from "vitest";
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

/** A pick of a finished game as D1 holds it: on the winner or the loser, on a given day. */
function seasonPick(game: Game, on: "winner" | "loser", chance: number, date: string): SeasonPick {
  const side = ({ id, abbreviation, name, score }: Game["home"]) => ({
    id,
    abbreviation,
    name,
    score,
  });
  const winner = game.home.score > game.away.score ? game.home : game.away;
  const loser = winner === game.home ? game.away : game.home;
  return {
    gameId: game.id,
    pickTeamId: (on === "winner" ? winner : loser).id,
    winProbability: chance,
    final: {
      date,
      startTime: `${date}T23:00:00.000Z`,
      home: side(game.home),
      away: side(game.away),
    },
  };
}
const [first, second, third] = finals as [Game, Game, Game];
const season = [
  seasonPick(first, "loser", 66.4, "2026-10-05"),
  seasonPick(second, "winner", 58, "2026-10-05"),
  seasonPick(third, "winner", 61, "2026-10-06"),
  // Made and not decided: it is in no count.
  { gameId: NSH_AT_TOR, pickTeamId: TORONTO, winProbability: 61.4, final: null },
];
const sources = { date: "2026-10-06", standings, finals: [], slate, predictions: new Map() };

test("with the season's picks, the facts hold the Picks page's figures in words a column can use", () => {
  const { picksRecord, picks } = writingFacts({ ...sources, seasonPicks: season });
  const loser = first.home.score > first.away.score ? first.away : first.home;
  const winner = loser === first.home ? first.away : first.home;

  expect(picksRecord).toEqual({ right: 2, wrong: 1 });
  expect(picks?.week).toEqual({
    from: "Monday, October 5",
    to: "Sunday, October 11",
    right: 2,
    wrong: 1,
    days: [
      { day: "Monday, October 5", right: 1, wrong: 1 },
      { day: "Tuesday, October 6", right: 1, wrong: 0 },
    ],
  });
  expect(picks?.run).toEqual({ outcome: "right", length: 2 });
  expect(picks?.worst).toEqual({
    game: first.id,
    day: "Monday, October 5",
    away: first.away.abbreviation,
    home: first.home.abbreviation,
    awayScore: first.away.score,
    homeScore: first.home.score,
    winner: winner.abbreviation,
    pick: { team: loser.abbreviation, winProbability: 66, outcome: "wrong" },
  });
  expect(picks?.best).toMatchObject({ game: third.id, pick: { outcome: "right" } });
  // No column on a miss has been written yet, so the miss to write about is the week's worst call.
  expect(picks?.miss).toEqual(picks?.worst);
});

test("the miss a column is told is one decided since the last such column, or none (#234)", () => {
  const written = { writtenFor: "2026-10-06", gameId: first.id };
  const sameMorning = writingFacts({ ...sources, seasonPicks: season, lastMiss: written });
  // Tuesday's column was about Monday's game; Tuesday night another pick lost, less firmly.
  const later = [...season.slice(0, 2), seasonPick(third, "loser", 54, "2026-10-06")];
  const nextMorning = writingFacts({
    ...sources,
    date: "2026-10-07",
    seasonPicks: later,
    lastMiss: written,
  });

  expect(sameMorning.picks?.miss).toBeNull();
  // The page's worst call is still the week's, whatever the column has said.
  expect(sameMorning.picks?.worst).toMatchObject({ game: first.id });
  expect(nextMorning.picks?.miss).toMatchObject({
    game: third.id,
    day: "Tuesday, October 6",
    pick: { winProbability: 54, outcome: "wrong" },
  });
  expect(nextMorning.picks?.worst).toMatchObject({ game: first.id });
});

test("without the season's picks the facts hold no figures of them", () => {
  expect(writingFacts(sources)).not.toHaveProperty("picks");
  expect(writingFacts({ ...sources, seasonPicks: null })).not.toHaveProperty("picksRecord");
});

test("before any pick is decided there is a record of none, and no week, run or call", () => {
  const { picksRecord, picks } = writingFacts({ ...sources, seasonPicks: season.slice(3) });

  expect(picksRecord).toEqual({ right: 0, wrong: 0 });
  expect(picks).toEqual({ week: null, run: null, best: null, worst: null, miss: null });
});

test("a call between clubs the facts cannot name is left out, and the counts stay", () => {
  const { picks, picksRecord } = writingFacts({
    ...sources,
    standings: null,
    slate: [],
    seasonPicks: season,
  });

  expect(picksRecord).toEqual({ right: 2, wrong: 1 });
  expect(picks).toMatchObject({ best: null, worst: null, miss: null });
});

test("picks that cannot be counted leave the figures out and the rest of the facts standing", () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const broken = [{ ...season[0], final: { date: "2026-10-05" } }] as unknown as SeasonPick[];

  const written = writingFacts({ ...sources, seasonPicks: broken });

  expect(written).not.toHaveProperty("picks");
  expect(written.slate.length).toBeGreaterThan(0);
  expect(errors).toHaveBeenCalled();
  errors.mockRestore();
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
