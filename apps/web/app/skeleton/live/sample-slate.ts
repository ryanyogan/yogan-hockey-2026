import type { ScoreboardGame, ScoreboardState } from "@yogan-hockey/schemas";

type Team = [abbreviation: string, score?: number];

/**
 * Each team's record and its building, by abbreviation. The records run from the shortest ESPN
 * sends to the longest a season reaches, and Tampa's building has the longest name in the league,
 * so the rows show what happens when either is too long for its place.
 */
const TEAMS: Record<string, [record: string, venue: string]> = {
  FLA: ["48-26-8", "Amerant Bank Arena"],
  TB: ["45-25-12", "Benchmark International Arena"],
  COL: ["2-0-0", "Ball Arena"],
  DAL: ["1-0-1", "American Airlines Center"],
  BUF: ["0-2-0", "KeyBank Center"],
  OTT: ["2-0-0", "Canadian Tire Centre"],
  TOR: ["1-2-0", "Scotiabank Arena"],
  MTL: ["1-0-1", "Bell Centre"],
  CHI: ["0-3-0", "United Center"],
  DET: ["0-2-0", "Little Caesars Arena"],
  PIT: ["1-1-0", "PPG Paints Arena"],
  WSH: ["2-0-0", "Capital One Arena"],
  NJ: ["1-1-0", "Prudential Center"],
  NYI: ["1-1-0", "UBS Arena"],
  BOS: ["10-12-3", "TD Garden"],
  NYR: ["3-1-0", "Madison Square Garden"],
  EDM: ["2-1-0", "Rogers Place"],
  VAN: ["1-1-1", "Rogers Arena"],
  VGK: ["2-1-0", "T-Mobile Arena"],
  LA: ["0-1-1", "crypto.com Arena"],
  CAR: ["1-1-1", "Lenovo Center"],
  CBJ: ["0-0-0", "Nationwide Arena"],
};

let nextId = 1;

function game(
  status: ScoreboardGame["status"],
  startTime: string,
  [away, home]: [Team, Team],
  over: Partial<ScoreboardGame> = {},
): ScoreboardGame {
  const side = ([abbreviation, score = 0]: Team, other: Team) => ({
    id: abbreviation,
    abbreviation,
    logo: null,
    logoDark: null,
    score,
    winner: status === "final" && score > (other[1] ?? 0),
    record: TEAMS[abbreviation]?.[0] ?? null,
  });
  return {
    id: `sample-${nextId++}`,
    startTime,
    seasonType: 2,
    status,
    period: 0,
    clock: "0:00",
    detail: "",
    venue: TEAMS[home[0]]?.[1] ?? null,
    away: side(away, home),
    home: side(home, away),
    ...over,
  };
}

/**
 * An invented slate with a game in every state the Scoreboard can report, since no recorded ESPN
 * slate has a game in progress: play, an intermission, overtime, a shootout, finals in regulation
 * and beyond it, a postponement.
 */
export const SAMPLE_SLATE: ScoreboardState = {
  date: "2026-10-06",
  updatedAt: "2026-10-07T00:14:07.000Z",
  games: [
    game("final", "2026-10-06T21:00:00Z", [
      ["FLA", 4],
      ["TB", 2],
    ]),
    game(
      "final",
      "2026-10-06T21:00:00Z",
      [
        ["COL", 2],
        ["DAL", 3],
      ],
      { period: 4 },
    ),
    game(
      "final",
      "2026-10-06T21:30:00Z",
      [
        ["BUF", 5],
        ["OTT", 4],
      ],
      { period: 5 },
    ),
    game(
      "live",
      "2026-10-06T23:00:00Z",
      [
        ["TOR", 2],
        ["MTL", 1],
      ],
      { period: 2, clock: "12:34" },
    ),
    game(
      "live",
      "2026-10-06T23:00:00Z",
      [
        ["CHI", 0],
        ["DET", 0],
      ],
      { period: 1, clock: "0:00" },
    ),
    game(
      "live",
      "2026-10-06T22:00:00Z",
      [
        ["PIT", 3],
        ["WSH", 3],
      ],
      { period: 4, clock: "3:21" },
    ),
    game(
      "live",
      "2026-10-06T22:00:00Z",
      [
        ["NJ", 1],
        ["NYI", 1],
      ],
      { period: 5 },
    ),
    game("scheduled", "2026-10-07T00:00:00Z", [["BOS"], ["NYR"]]),
    game("scheduled", "2026-10-07T02:00:00Z", [["EDM"], ["VAN"]]),
    game("scheduled", "2026-10-07T02:30:00Z", [["VGK"], ["LA"]]),
    game("postponed", "2026-10-06T23:30:00Z", [["CAR"], ["CBJ"]], { detail: "Postponed" }),
  ],
};

/** A day with nothing on it. */
export const EMPTY_SLATE: ScoreboardState = { ...SAMPLE_SLATE, games: [] };
