import type { FinalGame, Play } from "@yogan-hockey/schemas";
import { asc, eq, getTableColumns } from "drizzle-orm";
import type { Db } from "./client.ts";
import { games, plays } from "./schema.ts";

type GameRow = typeof games.$inferSelect;
type PlayRow = typeof plays.$inferSelect;

/** D1 allows 100 bound values in one statement, which caps how many play rows one insert holds. */
const D1_MAX_BOUND_VALUES = 100;
const PLAYS_PER_INSERT = Math.floor(
  D1_MAX_BOUND_VALUES / Object.keys(getTableColumns(plays)).length,
);

/** NHL days are US Eastern days: a 10 pm puck drop in Vancouver belongs to the day it started on. */
const easternDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Writes a finished game. Writing it again replaces the row, so the Scoreboard Agent, the Game
 * Agent and a catch-up can each write the same game and the last score ESPN gave is the one kept.
 */
export async function saveFinalGame(db: Db, game: FinalGame): Promise<void> {
  const row = toGameRow(game);
  const { id: _id, ...changes } = row;
  await db.insert(games).values(row).onConflictDoUpdate({ target: games.id, set: changes });
}

/**
 * Makes `gamePlays`, in the order given, the whole of a game's plays: plays ESPN has since
 * removed go, changed ones are overwritten. All of it happens or none of it does. The game's
 * row must exist first.
 */
export async function replaceGamePlays(db: Db, gameId: string, gamePlays: Play[]): Promise<void> {
  const rows = gamePlays.map((play, position) => toPlayRow(gameId, position, play));
  const inserts = [];
  for (let start = 0; start < rows.length; start += PLAYS_PER_INSERT) {
    inserts.push(db.insert(plays).values(rows.slice(start, start + PLAYS_PER_INSERT)));
  }
  await db.batch([db.delete(plays).where(eq(plays.gameId, gameId)), ...inserts]);
}

/**
 * A finished game and its plays in game order, which is all a Replay draws from. Null when the
 * game has no row; an empty `plays` when the game is there and its plays were never archived.
 */
export async function getGameWithPlays(
  db: Db,
  gameId: string,
): Promise<{ game: FinalGame; plays: Play[] } | null> {
  const [gameRows, playRows] = await db.batch([
    db.select().from(games).where(eq(games.id, gameId)),
    db.select().from(plays).where(eq(plays.gameId, gameId)).orderBy(asc(plays.position)),
  ]);
  const gameRow = gameRows[0];
  if (!gameRow) return null;
  return { game: toFinalGame(gameRow), plays: playRows.map(toPlay) };
}

/**
 * Whether a game's plays were ever archived. It reads one column of one row, where
 * `getGameWithPlays` loads every play. False for a game with no row.
 */
export async function gameHasPlays(db: Db, gameId: string): Promise<boolean> {
  const found = await db
    .select({ id: plays.id })
    .from(plays)
    .where(eq(plays.gameId, gameId))
    .limit(1);
  return found.length > 0;
}

function toGameRow(game: FinalGame): GameRow {
  return {
    id: game.id,
    date: easternDay.format(new Date(game.startTime)),
    startTime: game.startTime,
    season: game.season,
    seasonType: game.seasonType,
    homeTeamId: game.home.id,
    homeTeamAbbreviation: game.home.abbreviation,
    homeTeamName: game.home.name,
    homeScore: game.home.score,
    awayTeamId: game.away.id,
    awayTeamAbbreviation: game.away.abbreviation,
    awayTeamName: game.away.name,
    awayScore: game.away.score,
  };
}

function toFinalGame(row: GameRow): FinalGame {
  return {
    id: row.id,
    startTime: row.startTime,
    season: row.season,
    seasonType: row.seasonType,
    home: {
      id: row.homeTeamId,
      abbreviation: row.homeTeamAbbreviation,
      name: row.homeTeamName,
      score: row.homeScore,
    },
    away: {
      id: row.awayTeamId,
      abbreviation: row.awayTeamAbbreviation,
      name: row.awayTeamName,
      score: row.awayScore,
    },
  };
}

function toPlayRow(gameId: string, position: number, play: Play): PlayRow {
  const { id, type, period, clock, text, teamId, coordinate, scoring, penalty, ...detail } = play;
  return {
    gameId,
    id,
    position,
    type,
    period,
    clock,
    text,
    teamId,
    x: coordinate?.x ?? null,
    y: coordinate?.y ?? null,
    scoring,
    penalty,
    detail,
  };
}

function toPlay(row: PlayRow): Play {
  const { gameId: _gameId, position: _position, x, y, detail, ...columns } = row;
  return { ...columns, coordinate: x === null || y === null ? null : { x, y }, ...detail };
}
