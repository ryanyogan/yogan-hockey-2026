import {
  divisionPlace,
  type FactFinal,
  type FactGame,
  type FactGoal,
  type FactTeam,
  type Game,
  type GameSide,
  type Play,
  pickOutcome,
  type Standings,
  type StoredPrediction,
  type WritingFacts,
} from "@yogan-hockey/schemas";
import { ordinal } from "../../lib/ordinal";

/** The NHL's day is Eastern time's, and so is every time a piece prints. */
const NHL_TIME_ZONE = "America/New_York";

/** The date in Eastern time at an instant, `YYYY-MM-DD`. */
export function easternDate(instant: number): string {
  // en-CA writes a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: NHL_TIME_ZONE }).format(instant);
}

/** The `YYYY-MM-DD` date before one. */
export function dayBefore(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** "Monday, October 12" for a `YYYY-MM-DD` date. */
export function dayName(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(Date.parse(`${date}T12:00:00Z`));
}

/** "7:00 p.m. ET" for a start time. */
function startText(startTime: string): string {
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: NHL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(Date.parse(startTime));
  return `${clock.replace(/\s*AM$/i, " a.m.").replace(/\s*PM$/i, " p.m.")} ET`;
}

/** ESPN's "W2", "L1", "OT3" as words. Undefined for anything else. */
function streakText(streak: string): string | undefined {
  const match = /^(W|L|OTL?)(\d+)$/.exec(streak.trim().toUpperCase());
  if (!match) return undefined;
  const count = Number(match[2]);
  const run = count === 1 ? "1" : `${count} in a row`;
  if (match[1] === "W") return `won ${run}`;
  if (match[1] === "L") return `lost ${run}`;
  return `lost ${run} in overtime or a shootout`;
}

/** A game's finals and scheduled games name teams by abbreviation; this is the team behind one. */
function factTeam(side: GameSide, standings: Standings | null): FactTeam {
  const names = {
    team: side.abbreviation,
    name: side.name,
    city: side.location,
    nickname: side.shortName,
  };
  const placed = standings && divisionPlace(standings, side.id);
  if (!placed) return { ...names, record: side.record };
  const { row, rank } = placed;
  return {
    ...names,
    // The standings' own count, which a final has already reached when a slate's record has not.
    record: `${row.wins}-${row.losses}-${row.otLosses}`,
    points: row.points,
    division: row.division.name,
    conference: row.conference.name,
    divisionPlace: ordinal(rank),
    streak: streakText(row.streak),
    homeRecord: row.homeRecord,
    roadRecord: row.roadRecord,
    lastTen: row.lastTen,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
  };
}

function decidedIn(game: Game): FactFinal["decidedIn"] {
  if (/SO/.test(game.detail)) return "a shootout";
  return /OT/.test(game.detail) ? "overtime" : "regulation";
}

/** The goals of a game from its plays. A shootout's attempts are not goals of the game. */
function goalsOf(game: Game, plays: Play[]): FactGoal[] {
  const teams = new Map([
    [game.home.id, game.home.abbreviation],
    [game.away.id, game.away.abbreviation],
  ]);
  const goals: FactGoal[] = [];
  for (const play of plays) {
    const team = play.teamId === null ? undefined : teams.get(play.teamId);
    const scorer = play.participants.find(({ role }) => role === "scorer");
    if (!play.scoring || play.periodText === "SO" || !team || !scorer) continue;
    goals.push({
      period: play.periodText || ordinal(play.period),
      time: play.clock,
      team,
      scorer: scorer.name,
      assists: play.participants.filter(({ role }) => role === "assister").map(({ name }) => name),
    });
  }
  return goals;
}

/** The site's pick for a game as a piece is told it, or null when no Prediction was made. */
function factPick(game: Game, prediction: StoredPrediction | undefined): FactGame["pick"] {
  if (prediction?.status !== "made") return null;
  const side = [game.home, game.away].find(({ id }) => id === prediction.pickTeamId);
  if (!side) return null;
  return { team: side.abbreviation, winProbability: Math.round(prediction.winProbability) };
}

/** What a facts bundle is assembled from: all of it the site's own reads. */
export type FactSources = {
  /** The slate's date, `YYYY-MM-DD`. */
  date: string;
  /** Null when the standings could not be read: the teams then carry their names and records. */
  standings: Standings | null;
  /** The finished games to write about, each with its plays, or null where they could not be read. */
  finals: { game: Game; plays: Play[] | null }[];
  /** The games of `date`. Only those still to be played are kept. */
  slate: Game[];
  /** The site's prediction rows for any of those games, by game id. */
  predictions: Map<string, StoredPrediction>;
};

/**
 * The facts a piece is written from and checked against (#217). Built field by field, so nothing
 * else ESPN sends can reach the model: injuries, betting lines and broadcast names least of all.
 */
export function writingFacts(sources: FactSources): WritingFacts {
  const { date, standings, predictions } = sources;
  const finals = sources.finals.filter(({ game }) => game.status === "final");
  const slate = sources.slate.filter((game) => game.status === "scheduled");

  const teams = new Map<string, FactTeam>();
  // With the standings, every club; without them, the clubs that played or play.
  for (const row of standings?.rows ?? []) {
    const side = { ...row.team, score: 0, winner: false, record: null };
    teams.set(row.team.abbreviation, factTeam(side, standings));
  }
  for (const game of [...finals.map(({ game }) => game), ...slate]) {
    for (const side of [game.away, game.home]) {
      if (!teams.has(side.abbreviation)) teams.set(side.abbreviation, factTeam(side, standings));
    }
  }

  return {
    date,
    day: dayName(date),
    teams: [...teams.values()],
    finalsDay: finals[0] ? dayName(easternDate(Date.parse(finals[0].game.startTime))) : null,
    finals: finals.map(({ game, plays }) => {
      const prediction = predictions.get(game.id);
      const pick = factPick(game, prediction);
      const outcome = pickOutcome(prediction ?? null, game);
      return {
        game: game.id,
        away: game.away.abbreviation,
        home: game.home.abbreviation,
        awayScore: game.away.score,
        homeScore: game.home.score,
        winner: (game.away.score > game.home.score ? game.away : game.home).abbreviation,
        decidedIn: decidedIn(game),
        goals: plays && goalsOf(game, plays),
        pick: pick && outcome ? { ...pick, outcome } : null,
      };
    }),
    slate: slate.map((game) => ({
      game: game.id,
      away: game.away.abbreviation,
      home: game.home.abbreviation,
      start: startText(game.startTime),
      venue: game.venue,
      pick: factPick(game, predictions.get(game.id)),
    })),
  };
}
