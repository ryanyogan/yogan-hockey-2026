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
    dateShort: "Sun, Oct 11",
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
    dateShort: "Tue, Oct 6",
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
