import type { FactCall, WritingFacts } from "@yogan-hockey/schemas";

/**
 * A small world for the writing tests: two finals from Sunday, two games on Monday, six clubs.
 * Seattle beat Washington 5-3 (the pick, Seattle at 58%, was right); Dallas won 4-3 at Buffalo in
 * a shootout (the pick, Buffalo at 55%, was wrong). Tonight Vegas visits Seattle (the pick is
 * Seattle, 63%) and Dallas visits Vancouver (no pick yet).
 */
export function testFacts(): WritingFacts {
  return {
    date: "2026-10-12",
    day: "Monday, October 12",
    teams: [
      team("SEA", "Seattle", "Kraken", "4-2-0", 8, "Pacific Division", "1st", "won 3 in a row"),
      team("WSH", "Washington", "Capitals", "3-2-0", 6, "Metropolitan Division", "2nd", "lost 1"),
      team("DAL", "Dallas", "Stars", "3-1-1", 7, "Central Division", "1st", "won 2 in a row"),
      team("BUF", "Buffalo", "Sabres", "1-3-2", 4, "Atlantic Division", "7th", "lost 4 in a row"),
      team("VGK", "Vegas", "Golden Knights", "2-1-0", 4, "Pacific Division", "3rd", "won 1"),
      team("VAN", "Vancouver", "Canucks", "1-4-1", 3, "Pacific Division", "8th", "lost 2 in a row"),
    ],
    finalsDay: "Sunday, October 11",
    finals: [
      {
        game: "401",
        away: "SEA",
        home: "WSH",
        awayScore: 5,
        homeScore: 3,
        winner: "SEA",
        decidedIn: "regulation",
        goals: [
          goal("1st", "12:48", "SEA", "Matty Beniers", ["Vince Dunn"]),
          goal("1st", "3:10", "WSH", "Tom Wilson", []),
          goal("2nd", "15:02", "SEA", "Jared McCann", ["Matty Beniers", "Vince Dunn"]),
          goal("2nd", "9:40", "SEA", "Matty Beniers", []),
          goal("3rd", "16:21", "WSH", "Dylan Strome", ["Tom Wilson"]),
          goal("3rd", "8:05", "WSH", "Tom Wilson", ["Dylan Strome"]),
          goal("3rd", "4:33", "SEA", "Jared McCann", []),
          goal("3rd", "0:41", "SEA", "Vince Dunn", []),
        ],
        pick: { team: "SEA", winProbability: 58, outcome: "right" },
      },
      {
        game: "402",
        away: "DAL",
        home: "BUF",
        awayScore: 4,
        homeScore: 3,
        winner: "DAL",
        decidedIn: "a shootout",
        goals: null,
        pick: { team: "BUF", winProbability: 55, outcome: "wrong" },
      },
    ],
    slate: [
      {
        game: "403",
        away: "VGK",
        home: "SEA",
        start: "10:00 p.m. ET",
        venue: "Climate Pledge Arena",
        pick: { team: "SEA", winProbability: 63 },
      },
      { game: "404", away: "DAL", home: "VAN", start: "10:30 p.m. ET", venue: null, pick: null },
    ],
  };
}

/**
 * The same world as the Picks page's columns are told it: the season's picks are 12 right and 9
 * wrong, the week 7-3 over three days, the last 4 picks right. The week's best call is Seattle
 * at 58% (5-3 at Washington) and its worst Buffalo at 55% (a 4-3 loss to Dallas), both on Sunday.
 * No column has been written about that miss yet, so it is the one to write about.
 */
export function testPicksFacts(): WritingFacts {
  const facts = testFacts();
  const [won, lost] = facts.finals.map(({ decidedIn: _decidedIn, goals: _goals, ...final }) => ({
    ...final,
    day: "Sunday, October 11",
  })) as [FactCall, FactCall];
  return {
    ...facts,
    picksRecord: { right: 12, wrong: 9 },
    picks: {
      week: {
        from: "Monday, October 5",
        to: "Sunday, October 11",
        right: 7,
        wrong: 3,
        days: [
          { day: "Thursday, October 8", right: 2, wrong: 1 },
          { day: "Saturday, October 10", right: 3, wrong: 1 },
          { day: "Sunday, October 11", right: 2, wrong: 1 },
        ],
      },
      run: { outcome: "right", length: 4 },
      best: won,
      worst: lost,
      miss: lost,
    },
  };
}

function team(
  abbreviation: string,
  city: string,
  nickname: string,
  record: string,
  points: number,
  division: string,
  divisionPlace: string,
  streak: string,
): WritingFacts["teams"][number] {
  return {
    team: abbreviation,
    name: `${city} ${nickname}`,
    city,
    nickname,
    record,
    points,
    division,
    conference: /Pacific|Central/.test(division) ? "Western Conference" : "Eastern Conference",
    divisionPlace,
    streak,
    homeRecord: "2-1-0",
    roadRecord: "1-1-0",
    lastTen: record,
  };
}

function goal(
  period: string,
  time: string,
  scoringTeam: string,
  scorer: string,
  assists: string[],
) {
  return { period, time, team: scoringTeam, scorer, assists };
}

/** A piece that breaks no rule against `testFacts()`. */
export const GOOD_PIECE = {
  headline: "Beniers scores twice as Kraken win a third straight",
  paragraphs: [
    "Matty Beniers scored twice and the Kraken beat the Capitals 5-3 on Sunday. Seattle has won 3 in a row and sits 1st in the Pacific Division at 4-2-0.",
    "Jared McCann also had 2 goals for Seattle, the second at 4:33 of the 3rd to break a 3-3 tie. Tom Wilson scored twice for Washington, which fell to 3-2-0. Our pick was Seattle, and it was right.",
    "The Stars won 4-3 at Buffalo in a shootout. The Sabres have lost 4 in a row.",
  ],
};
