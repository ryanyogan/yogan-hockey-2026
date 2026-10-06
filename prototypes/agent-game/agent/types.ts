export type Play = {
  id: string;
  period: string;
  clock: string;
  type: string;
  text: string;
  goal: boolean;
  x?: number;
  y?: number;
};

export type GameState = {
  eventId: string | null;
  mode: "idle" | "live" | "replay";
  status: string;
  home: { abbr: string; score: number };
  away: { abbr: string; score: number };
  plays: Play[]; // newest first, capped
  totalPlays: number;
  polls: number;
  finished: boolean;
  lastPoll: {
    at: string;
    httpStatus: number;
    cacheControl: string | null;
    bytes: number;
    fetchMs: number;
    colo: string | null;
    error: string | null;
  } | null;
};

export const EMPTY: GameState = {
  eventId: null,
  mode: "idle",
  status: "not started",
  home: { abbr: "HOME", score: 0 },
  away: { abbr: "AWAY", score: 0 },
  plays: [],
  totalPlays: 0,
  polls: 0,
  finished: false,
  lastPoll: null,
};
