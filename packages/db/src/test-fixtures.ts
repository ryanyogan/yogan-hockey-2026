import type { FinalGame, MadePrediction, Play } from "@yogan-hockey/schemas";

/** Dallas 4 at Buffalo 3, decided in a shootout on 15 April 2026 (ESPN event 401803652). */
export function finalGame(overrides: Partial<FinalGame> = {}): FinalGame {
  return {
    id: "401803652",
    startTime: "2026-04-15T23:00:00Z",
    season: 2026,
    seasonType: 2,
    home: { id: "2", abbreviation: "BUF", name: "Buffalo Sabres", score: 3 },
    away: { id: "9", abbreviation: "DAL", name: "Dallas Stars", score: 4 },
    ...overrides,
  };
}

/** A goal from that game, with every field ESPN can fill. */
export function goal(overrides: Partial<Play> = {}): Play {
  return {
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
    wallclock: "2026-04-15T23:10:03Z",
    participants: [
      { athleteId: "4697413", name: "Mavrik Bourque", shortName: "M. Bourque", role: "scorer" },
      { athleteId: "3069352", name: "Esa Lindell", shortName: "E. Lindell", role: "assister" },
    ],
    ...overrides,
  };
}

/** A play with nothing optional: no team, no coordinate, nobody named. */
export function periodStart(overrides: Partial<Play> = {}): Play {
  return {
    id: "401803652000000520",
    type: "period-start",
    typeText: "Period Start",
    period: 1,
    periodText: "1st",
    clock: "0:00",
    text: "Start of 1st Period",
    teamId: null,
    coordinate: null,
    scoring: false,
    penalty: false,
    homeScore: 0,
    awayScore: 0,
    strength: null,
    wallclock: null,
    participants: [],
    ...overrides,
  };
}

/** The pick for that game: Dallas, the away team, which won. */
export function madePrediction(overrides: Partial<MadePrediction> = {}): MadePrediction {
  return {
    gameId: "401803652",
    status: "made",
    pickTeamId: "9",
    winProbability: 58,
    reasoning: "Dallas has won four straight and Buffalo is on the second night of a back-to-back.",
    keyFactors: ["Dallas has won four straight", "Buffalo played last night"],
    madeAt: "2026-04-15T14:02:11Z",
    model: "@cf/openai/gpt-oss-120b",
    inputs: { home: { record: "40-30-11" }, away: { record: "49-25-7" } },
    ...overrides,
  };
}
