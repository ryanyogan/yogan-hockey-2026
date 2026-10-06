import type { ScoreboardGame, ScoreboardState } from "@yogan-hockey/schemas";

type Team = [abbreviation: string, shortName: string, score?: number];

let nextId = 1;

function game(
  status: ScoreboardGame["status"],
  startTime: string,
  [away, home]: [Team, Team],
  over: Partial<ScoreboardGame> = {},
): ScoreboardGame {
  const side = ([abbreviation, shortName, score = 0]: Team, other: Team) => ({
    id: abbreviation,
    abbreviation,
    shortName,
    logo: null,
    logoDark: null,
    score,
    winner: status === "final" && score > (other[2] ?? 0),
  });
  return {
    id: `sample-${nextId++}`,
    startTime,
    seasonType: 2,
    status,
    period: 0,
    clock: "0:00",
    detail: "",
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
      ["FLA", "Panthers", 4],
      ["TB", "Lightning", 2],
    ]),
    game(
      "final",
      "2026-10-06T21:00:00Z",
      [
        ["COL", "Avalanche", 2],
        ["DAL", "Stars", 3],
      ],
      { period: 4 },
    ),
    game(
      "final",
      "2026-10-06T21:30:00Z",
      [
        ["BUF", "Sabres", 5],
        ["OTT", "Senators", 4],
      ],
      { period: 5 },
    ),
    game(
      "live",
      "2026-10-06T23:00:00Z",
      [
        ["TOR", "Maple Leafs", 2],
        ["MTL", "Canadiens", 1],
      ],
      { period: 2, clock: "12:34" },
    ),
    game(
      "live",
      "2026-10-06T23:00:00Z",
      [
        ["CHI", "Blackhawks", 0],
        ["DET", "Red Wings", 0],
      ],
      { period: 1, clock: "0:00" },
    ),
    game(
      "live",
      "2026-10-06T22:00:00Z",
      [
        ["PIT", "Penguins", 3],
        ["WSH", "Capitals", 3],
      ],
      { period: 4, clock: "3:21" },
    ),
    game(
      "live",
      "2026-10-06T22:00:00Z",
      [
        ["NJ", "Devils", 1],
        ["NYI", "Islanders", 1],
      ],
      { period: 5 },
    ),
    game("scheduled", "2026-10-07T00:00:00Z", [
      ["BOS", "Bruins"],
      ["NYR", "Rangers"],
    ]),
    game("scheduled", "2026-10-07T02:00:00Z", [
      ["EDM", "Oilers"],
      ["VAN", "Canucks"],
    ]),
    game("scheduled", "2026-10-07T02:30:00Z", [
      ["VGK", "Golden Knights"],
      ["LA", "Kings"],
    ]),
    game(
      "postponed",
      "2026-10-06T23:30:00Z",
      [
        ["CAR", "Hurricanes"],
        ["CBJ", "Blue Jackets"],
      ],
      { detail: "Postponed" },
    ),
  ],
};

/** A day with nothing on it. */
export const EMPTY_SLATE: ScoreboardState = { ...SAMPLE_SLATE, games: [] };
