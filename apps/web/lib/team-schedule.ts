import type {
  Game,
  GameSide,
  ScoreboardGame,
  ScoreboardState,
  TeamSchedule,
} from "@yogan-hockey/schemas";
import { NHL_TIME_ZONE } from "./game-time";

/*
 * What a team page works out from a team's games before drawing them. Nothing here touches the
 * server, so client components use it.
 */

/** One game as the team's own schedule lists it: against an opponent, at home or away. */
export type ScheduleRow = {
  game: Game;
  opponent: GameSide;
  /** True when the team whose schedule this is plays at home. */
  home: boolean;
};

/** A finished game, scored from the team's side. */
export type ResultRow = ScheduleRow & {
  won: boolean;
  teamScore: number;
  opponentScore: number;
  /** "OT", "SO" or "2OT" when the game went past regulation. */
  extraTime: string | null;
};

export type ScheduleView = {
  /** The games to come, and one being played, in the schedule's order (by date). */
  upcoming: ScheduleRow[];
  /** Games off the calendar without a result: postponed, cancelled or suspended. */
  postponed: ScheduleRow[];
  /** Every finished game, newest first. */
  results: ResultRow[];
  /** The results counted. An overtime loss is a loss here; the header has the standings' split. */
  wins: number;
  losses: number;
};

/** ESPN words a final that ran long as "Final/OT", "Final/SO" or "Final/2OT". */
function extraTime(detail: string): string | null {
  return /\/(\d*OT|SO)$/.exec(detail)?.[1] ?? null;
}

/** A game seen from one team's side. */
export function scheduleRow(teamId: string, game: Game): ScheduleRow {
  const home = game.home.id === teamId;
  return { game, opponent: home ? game.away : game.home, home };
}

/** Splits a team's schedule into the games to come, the postponed and its results. */
export function scheduleView({ teamId, games }: TeamSchedule): ScheduleView {
  const view: ScheduleView = { upcoming: [], postponed: [], results: [], wins: 0, losses: 0 };
  for (const game of games) {
    const row = scheduleRow(teamId, game);
    if (game.status === "postponed") view.postponed.push(row);
    else if (game.status !== "final") view.upcoming.push(row);
    else {
      const team = row.home ? game.home : game.away;
      view.results.push({
        ...row,
        won: team.winner,
        teamScore: team.score,
        opponentScore: row.opponent.score,
        extraTime: extraTime(game.detail),
      });
    }
  }
  view.results.reverse();
  view.wins = view.results.filter((row) => row.won).length;
  view.losses = view.results.length - view.wins;
  return view;
}

/** The team's game in progress on today's slate, or null when it is not playing now. */
export function liveGame(teamId: string, slate: readonly ScoreboardGame[]): ScoreboardGame | null {
  return (
    slate.find(
      (game) => game.status === "live" && (game.home.id === teamId || game.away.id === teamId),
    ) ?? null
  );
}

/** The day a game starts as the NHL counts it (Eastern time), `YYYY-MM-DD`: a slate's date. */
function slateDate(startTime: string): string {
  // The Canadian form of a date is year-month-day.
  return new Intl.DateTimeFormat("en-CA", { timeZone: NHL_TIME_ZONE }).format(new Date(startTime));
}

/**
 * The game to show as the team's next: the one ESPN lists, while it is still to be played. The
 * team page is cached for an hour, so the Scoreboard is asked whether that game has started, and
 * a game from a day before the Scoreboard's is taken as played.
 */
export function nextGame(
  listed: Game | null,
  { date, games }: Pick<ScoreboardState, "date" | "games">,
): Game | null {
  if (listed?.status !== "scheduled") return null;
  const today = games.find((game) => game.id === listed.id);
  if (today != null) return today.status === "scheduled" ? listed : null;
  return date != null && slateDate(listed.startTime) < date ? null : listed;
}

/**
 * The pick to show on the team's next game: the slate's line for it ("TOR 58%", "pick pending"),
 * and nothing for a game with no line or one that is not on today's slate. `picks` is as old as
 * the page's last render, so it is the Scoreboard's slate now that says which games are today's.
 */
export function nextGamePick(
  next: Pick<Game, "id">,
  picks: Readonly<Record<string, string>>,
  slate: readonly Pick<ScoreboardGame, "id">[],
): string | undefined {
  return slate.some((game) => game.id === next.id) ? picks[next.id] : undefined;
}
