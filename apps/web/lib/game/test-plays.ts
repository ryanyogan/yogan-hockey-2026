import { getGameSummary } from "@yogan-hockey/espn";
import type { GameSummary, Play } from "@yogan-hockey/schemas";
import { vi } from "vitest";

/** The recorded shootout: Dallas (away, team 9) 4, Buffalo (home, team 2) 3, 307 plays. */
export const SHOOTOUT_GAME = "401803652";
export const BUFFALO = "2";
export const DALLAS = "9";

export async function recordedShootout(): Promise<GameSummary> {
  vi.stubEnv("ESPN_FIXTURES", "1");
  try {
    return await getGameSummary(SHOOTOUT_GAME);
  } finally {
    vi.unstubAllEnvs();
  }
}

let nextId = 1;

/** A play with only what a test cares about spelled out. */
export function play(overrides: Partial<Play> = {}): Play {
  return {
    id: String(nextId++),
    type: "shot-on-goal",
    typeText: "Shot",
    period: 1,
    periodText: "1st",
    clock: "0:00",
    text: "A shot",
    teamId: BUFFALO,
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
