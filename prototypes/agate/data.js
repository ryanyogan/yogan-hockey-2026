// PROTOTYPE (Agate). Sample data the screens draw. Not the app's data layer.
//
// TONIGHT is the slate on hockey.yogan.dev for Sun Oct 11 2026, copied as the site showed it.
// BUSY is the nine-game slate of prototypes/tuned-ledger/data.js (ESPN fixtures with invented
// scores and clocks laid over seven games), so finals, live, overtime, scheduled and a game with
// no pick all show together.
// STANDINGS is the top eight of each conference as the site showed it on Oct 11.

/**
 * What the Agate copy needs per club, beyond the abbreviation the scoreboard carries today.
 * `location` and `shortName` are `Team.location` / `Team.shortName` in packages/schemas.
 * `agate` is the name in agate type: the location, except where two clubs share one.
 */
export const TEAMS = {
  ANA: { location: "Anaheim", shortName: "Ducks" },
  BOS: { location: "Boston", shortName: "Bruins" },
  BUF: { location: "Buffalo", shortName: "Sabres" },
  CAR: { location: "Carolina", shortName: "Hurricanes" },
  CHI: { location: "Chicago", shortName: "Blackhawks" },
  COL: { location: "Colorado", shortName: "Avalanche" },
  DET: { location: "Detroit", shortName: "Red Wings" },
  EDM: { location: "Edmonton", shortName: "Oilers" },
  FLA: { location: "Florida", shortName: "Panthers" },
  LA: { location: "Los Angeles", shortName: "Kings" },
  MIN: { location: "Minnesota", shortName: "Wild" },
  MTL: { location: "Montreal", shortName: "Canadiens" },
  NJ: { location: "New Jersey", shortName: "Devils" },
  NSH: { location: "Nashville", shortName: "Predators" },
  NYI: { location: "New York", shortName: "Islanders", agate: "N.Y. Islanders" },
  NYR: { location: "New York", shortName: "Rangers", agate: "N.Y. Rangers" },
  OTT: { location: "Ottawa", shortName: "Senators" },
  PHI: { location: "Philadelphia", shortName: "Flyers" },
  PIT: { location: "Pittsburgh", shortName: "Penguins" },
  SEA: { location: "Seattle", shortName: "Kraken" },
  STL: { location: "St. Louis", shortName: "Blues" },
  TB: { location: "Tampa Bay", shortName: "Lightning" },
  TOR: { location: "Toronto", shortName: "Maple Leafs" },
  UTA: { location: "Utah", shortName: "Mammoth" },
  VAN: { location: "Vancouver", shortName: "Canucks" },
  VGK: { location: "Vegas", shortName: "Golden Knights" },
  WPG: { location: "Winnipeg", shortName: "Jets" },
  WSH: { location: "Washington", shortName: "Capitals" },
};

/*
 * A game, close to ScoreboardGame:
 *   status   "final" | "live" | "scheduled" | "postponed"
 *   detail   "Final", "Final/OT", "3rd 18:44", "OT 2:10" (the site's `line`)
 *   start    the local start time the site prints for a scheduled game
 *   pick     { team, pct } or null (MadePrediction.pickTeamId / winProbability)
 */
export const SLATES = {
  tonight: {
    date: "Sunday, October 11",
    record: { right: 29, wrong: 14 },
    games: [
      {
        status: "final",
        detail: "Final",
        away: { abbr: "SEA", record: "4-2-0", score: 5 },
        home: { abbr: "WSH", record: "3-2-0", score: 3 },
        pick: { team: "WSH", pct: 63 },
        venue: "Capital One Arena",
        tv: "ESPN+, MNMT, KONG, KHN, Prime Video (Local)",
      },
      {
        status: "final",
        detail: "Final",
        away: { abbr: "VAN", record: "2-5-0", score: 2 },
        home: { abbr: "NYR", record: "5-2-0", score: 6 },
        pick: { team: "NYR", pct: 62 },
        venue: "Madison Square Garden",
        tv: "ESPN+, MSG",
      },
      {
        status: "final",
        detail: "Final",
        away: { abbr: "CAR", record: "5-1-1", score: 4 },
        home: { abbr: "PHI", record: "0-5-2", score: 1 },
        pick: { team: "CAR", pct: 78 },
        venue: "Xfinity Mobile Arena",
        tv: "NHL Net, NBC Sports Phil, CARNHL",
      },
    ],
  },
  busy: {
    date: "Tuesday, October 6",
    record: { right: 3, wrong: 2 },
    games: [
      {
        status: "final",
        detail: "Final",
        away: { abbr: "CAR", record: "1-1-1", score: 2 },
        home: { abbr: "MTL", record: "1-0-1", score: 3 },
        pick: { team: "MTL", pct: 52 },
        venue: "Bell Centre",
        tv: "ESPN+, CARNHL",
      },
      {
        status: "final",
        detail: "Final/OT",
        away: { abbr: "NSH", record: "1-1-0", score: 3 },
        home: { abbr: "TOR", record: "1-2-0", score: 4 },
        pick: { team: "TOR", pct: 58 },
        venue: "Scotiabank Arena",
        tv: "ESPN+, Scripps Sports",
      },
      {
        status: "final",
        detail: "Final",
        away: { abbr: "OTT", record: "2-0-0", score: 4 },
        home: { abbr: "DET", record: "0-2-0", score: 1 },
        pick: null,
        venue: "Little Caesars Arena",
        tv: "ESPN+, DSN",
      },
      {
        status: "live",
        detail: "3rd 18:44",
        away: { abbr: "UTA", record: "2-1-0", score: 2 },
        home: { abbr: "NJ", record: "1-1-0", score: 2 },
        pick: { team: "NJ", pct: 61 },
        venue: "Prudential Center",
        tv: "ESPN+, MSGSN, Utah 16",
      },
      {
        status: "live",
        detail: "OT 2:10",
        away: { abbr: "MIN", record: "2-0-0", score: 3 },
        home: { abbr: "BUF", record: "1-1-0", score: 3 },
        pick: { team: "BUF", pct: 64 },
        venue: "KeyBank Center",
        tv: "ESPN+, MSGB, MINNHL",
      },
      {
        status: "live",
        detail: "3rd 9:02",
        away: { abbr: "NYI", record: "1-1-0", score: 1 },
        home: { abbr: "NYR", record: "3-1-0", score: 2 },
        pick: { team: "NYR", pct: 53 },
        venue: "Madison Square Garden",
        tv: "ESPN",
      },
      {
        status: "live",
        detail: "2nd 14:20",
        away: { abbr: "STL", record: "1-1-0", score: 0 },
        home: { abbr: "CHI", record: "0-3-0", score: 1 },
        pick: { team: "CHI", pct: 56 },
        venue: "United Center",
        tv: "ESPN+, CHSN, Blues App, BN+",
      },
      {
        status: "scheduled",
        start: "8:40 PM",
        away: { abbr: "VGK", record: "2-1-0", score: null },
        home: { abbr: "SEA", record: "2-1-0", score: null },
        pick: { team: "SEA", pct: 59 },
        venue: "Climate Pledge Arena",
        tv: "ESPN+, Scripps Sports, KONG, KING 5, KHN, Prime Video (Local)",
      },
      {
        status: "scheduled",
        start: "9:00 PM",
        away: { abbr: "FLA", record: "1-0-2", score: null },
        home: { abbr: "LA", record: "0-1-1", score: null },
        pick: { team: "LA", pct: 62 },
        venue: "crypto.com Arena",
        tv: "ESPN",
      },
    ],
  },
};

const row = (abbr, w, l, otl, pts) => ({ abbr, w, l, otl, pts });
export const STANDINGS = {
  east: [
    row("CAR", 5, 1, 1, 11),
    row("NYR", 5, 2, 0, 10),
    row("TB", 4, 1, 0, 8),
    row("OTT", 4, 1, 0, 8),
    row("BOS", 4, 2, 0, 8),
    row("TOR", 3, 2, 1, 7),
    row("PIT", 3, 2, 1, 7),
    row("WSH", 3, 2, 0, 6),
  ],
  west: [
    row("VGK", 5, 1, 0, 10),
    row("EDM", 4, 0, 1, 9),
    row("ANA", 4, 1, 0, 8),
    row("SEA", 4, 2, 0, 8),
    row("UTA", 4, 2, 0, 8),
    row("MIN", 3, 1, 1, 7),
    row("WPG", 3, 1, 1, 7),
    row("COL", 3, 2, 0, 6),
  ],
};

/*
 * NEWS is ESPN's NHL headlines as its news endpoint listed them on the evening of Mon Oct 12
 * 2026 (`packages/espn/fixtures/news.json`, the first six that are not videos), with the day and
 * time each was published as a visitor in the East reads them. `url` is the article on ESPN.
 */
export const NEWS = [
  {
    headline: "Noah Ostlund scores go-ahead goal in third period in Sabres' 5-3 win over Panthers",
    when: "Mon Oct 12 · 5:18 PM",
    url: "https://www.espn.com/nhl/recap?gameId=401892485",
  },
  {
    headline: "Where to watch 2026 NHL Frozen Frenzy",
    when: "Mon Oct 12 · 5:03 PM",
    url: "https://www.espn.com/nhl/story/_/id/50168025/watch-2026-nhl-frozen-frenzy",
  },
  {
    headline: "Arizona State in talks with Avalanche's Dave Hakstol to coach hockey team",
    when: "Mon Oct 12 · 5:04 PM",
    url: "https://www.espn.com/college-sports/blog/college_sports/story/_/id/50168628/arizona-state-talks-dave-hakstol-coach-hockey-team",
  },
  {
    headline: "Sabres' Dahlin out Tuesday vs. Canadiens due to upper-body injury",
    when: "Mon Oct 12 · 5:17 PM",
    url: "https://www.espn.com/nhl/story/_/id/50168195/sabres-dahlin-leaves-game-vs-panthers-upper-body-injury",
  },
  {
    headline: "Blackhawks captain Connor Bedard likely to make season debut Tuesday",
    when: "Mon Oct 12 · 3:57 PM",
    url: "https://www.espn.com/nhl/story/_/id/50168099/blackhawks-captain-connor-bedard-likely-make-season-debut-tuesday",
  },
  {
    headline: "Fantasy hockey weekly pickups: Goalie options to replace Igor Shesterkin",
    when: "Mon Oct 12 · 2:54 PM",
    url: "https://www.espn.com/fantasy/hockey/story/_/id/50166671/fantasy-hockey-picks-forwards-defense-goalies-streamers",
  },
];

/*
 * PIECES is the written pieces (#217) as fixture mode has them (`apps/web/lib/sample-pieces.ts`,
 * word for word), in Home's order: the preview and the standings note of the slate fixture mode
 * has recorded (Tue Oct 6), and a recap of the three finals above, dated the night before it.
 * `when` is the time each was
 * written as a visitor in the East reads it. No model wrote these: they are samples in the voice.
 */
export const PIECES = [
  {
    kind: "preview",
    date: "2026-10-06",
    when: "Tue Oct 6 · 11:16 AM",
    headline: "Nine games tonight, and Buffalo is the firmest pick on the board",
    paragraphs: [
      "Nine games are on tonight's slate, five of them starting at 7 p.m. Eastern. The Senators, 2-0-0, visit a Red Wings team still looking for a first win at 0-2-0.",
      "The site's firmest pick is Buffalo, at 64 percent, at home against a Wild team that has won both of its games. Los Angeles is next at 62 percent against Florida, and New Jersey is at 61 percent against Utah.",
      "The closest call is in Montreal, where the Canadiens are the pick over Carolina at 52 percent. Toronto is the pick over Nashville at 58 percent, and Seattle is the pick over Vegas at 59 percent in the late game.",
    ],
  },
  {
    kind: "recap",
    date: "2026-10-05",
    when: "Tue Oct 6 · 1:06 AM",
    headline: "Kraken win 5-3 in Washington, and the Rangers and Hurricanes win by more",
    paragraphs: [
      "The Kraken won 5-3 in Washington on Monday. The Capitals were the site's pick at 63 percent, and that pick was wrong.",
      "The Rangers beat the Canucks 6-2 at Madison Square Garden. The site had New York at 62 percent, and that pick was right.",
      "The Hurricanes won 4-1 in Philadelphia. Carolina was the pick at 78 percent, which made it two right out of three on the night.",
    ],
  },
  {
    kind: "league",
    date: "2026-10-06",
    when: "Tue Oct 6 · 11:17 AM",
    headline: "Rangers lead the East as Edmonton and Winnipeg share the top of the West",
    paragraphs: [
      "The Rangers have the most points in the East, 6, from three wins in four games. Ottawa has played twice and won twice.",
      "In the West, Edmonton and Winnipeg have 5 points each at 2-0-1. Colorado, Minnesota and Anaheim have each won their first two games.",
      "It is early. No team in either top eight has played more than four games, and tonight's nine will move most of these places.",
    ],
  },
];

/*
 * PICKS is the Picks page's figures (#218) as the site's fixture mode has them: what
 * `apps/web/lib/picks-figures.ts` makes of the five decided sample picks of
 * `apps/web/lib/sample-picks.ts` with the recorded slate's date, Tue Oct 6 2026.
 *
 *   Sat Oct 3   Montreal 2 at Toronto 3, Toronto picked at 57%          right
 *               Dallas 4 at Buffalo 2, Buffalo picked at 55%            wrong
 *   Mon Oct 5   Seattle 5 at Washington 3, Washington picked at 63%     wrong
 *               Vancouver 2 at N.Y. Rangers 6, the Rangers at 62%       right
 *               Carolina 4 at Philadelphia 1, Carolina at 78%           right
 *
 * The week is Mon Oct 5 to Sun Oct 11, so Saturday's two are in the season and not the week. The
 * run is the last two, in the order the games started. `awaiting` is the eight picks of the
 * recorded slate, whose games have no final. The shape is `PicksFigures`.
 */
export const PICKS = {
  season: { right: 3, wrong: 2 },
  awaiting: 8,
  run: { outcome: "right", length: 2 },
  week: {
    start: "2026-10-05",
    end: "2026-10-11",
    current: true,
    tally: { right: 2, wrong: 1 },
    days: [{ date: "2026-10-05", right: 2, wrong: 1 }],
    best: {
      date: "2026-10-05",
      picked: { abbreviation: "CAR", name: "Carolina Hurricanes" },
      opponent: { abbreviation: "PHI", name: "Philadelphia Flyers" },
      pickedHome: false,
      winProbability: 78,
      score: { picked: 4, opponent: 1 },
    },
    worst: {
      date: "2026-10-05",
      picked: { abbreviation: "WSH", name: "Washington Capitals" },
      opponent: { abbreviation: "SEA", name: "Seattle Kraken" },
      pickedHome: true,
      winProbability: 63,
      score: { picked: 3, opponent: 5 },
    },
  },
  bands: [
    { from: 50, to: 54, right: 0, wrong: 0 },
    { from: 55, to: 59, right: 1, wrong: 1 },
    { from: 60, to: 64, right: 1, wrong: 1 },
    { from: 65, to: null, right: 1, wrong: 0 },
  ],
  sides: { home: { right: 2, wrong: 2 }, road: { right: 1, wrong: 0 } },
};

/**
 * The big figures in the middle of a season (`?season=mid`): a week, a run and a record as wide
 * as they get, to see that the three still fit a phone.
 */
export const PICKS_MID = {
  week: { right: 12, wrong: 9 },
  run: { outcome: "right", length: 11 },
  season: { right: 129, wrong: 114 },
};

/*
 * COLUMNS is the Picks page's three columns as fixture mode has them (`SAMPLE_COLUMNS` in
 * `apps/web/lib/sample-pieces.ts`, word for word), in the page's order (`COLUMN_KINDS`). `when`
 * is the time each was written as a visitor in the East reads it. No model wrote these.
 */
export const COLUMNS = [
  {
    kind: "picks-tonight",
    date: "2026-10-06",
    when: "Tue Oct 6 · 11:18 AM",
    headline:
      "Buffalo at 64 percent is the firmest pick tonight, and Montreal is barely a pick at all",
    paragraphs: [
      "The game to watch tonight is in Buffalo. The Sabres are our pick at 64 percent, the firmest on a board of nine games, against a Wild team that has won both of its games.",
      "That is the pick with the most to lose. Minnesota is 2-0-0, and a miss here would be the firmest wrong pick of the season, past Washington at 63 percent on Monday.",
      "The other end of the board is in Montreal, where the Canadiens are the pick over Carolina at 52 percent. At 52 the pick is a lean and no more.",
    ],
  },
  {
    kind: "picks-miss",
    date: "2026-10-06",
    when: "Tue Oct 6 · 11:19 AM",
    headline: "Washington at 63 percent is the pick this week would like back",
    paragraphs: [
      "Every week has one pick it would like back. This week's came on Monday in Washington, where the Capitals were our pick at 63 percent and the Kraken won 5-3.",
      "It was the only wrong pick of Monday's three. The Rangers, at 62 percent, beat the Canucks 6-2, and the Hurricanes, at 78 percent, won 4-1 in Philadelphia.",
      "A pick at 63 percent is not a promise, and nobody here took it for one. This one lost by two goals, and it goes in the wrong column with no excuse attached.",
    ],
  },
  {
    kind: "picks-run",
    date: "2026-10-06",
    when: "Tue Oct 6 · 11:20 AM",
    headline: "Two right in a row, and a 3-2 record that one game could turn over",
    paragraphs: [
      "The picks are 3-2 on the season after going 2 for 3 on Monday. That is a winning record by the width of one game, which is the only width a record of five games has.",
      "The last two came in: the Rangers at 62 percent and the Hurricanes at 78 percent. The home team has been the pick four times and won twice. The road team has been the pick once, and Carolina won.",
      "None of it means much yet. Eight picks are on tonight's board, and by the morning the record will have more than doubled its games.",
    ],
  },
];
