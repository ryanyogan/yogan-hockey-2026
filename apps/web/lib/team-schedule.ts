import type { Game, GameSide, ScoreboardGame, TeamSchedule } from "@yogan-hockey/schemas";

/** What a team page works out from a team's games before drawing them. */

/** A game's page: the matchup, the Game Stream or the Replay, by where the game stands. */
export function gameHref(game: Pick<Game, "id">): string {
  return `/nhl/games/${game.id}`;
}

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
  /** Every game without a result, in date order: scheduled, in progress or postponed. */
  upcoming: ScheduleRow[];
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

/** Splits a team's schedule into the games still to play and its results. */
export function scheduleView({ teamId, games }: TeamSchedule): ScheduleView {
  const upcoming: ScheduleRow[] = [];
  const results: ResultRow[] = [];
  for (const game of games) {
    const home = game.home.id === teamId;
    const [team, opponent] = home ? [game.home, game.away] : [game.away, game.home];
    const row = { game, opponent, home };
    if (game.status !== "final") upcoming.push(row);
    else
      results.push({
        ...row,
        won: team.winner,
        teamScore: team.score,
        opponentScore: opponent.score,
        extraTime: extraTime(game.detail),
      });
  }
  const wins = results.filter((row) => row.won).length;
  return { upcoming, results: results.reverse(), wins, losses: results.length - wins };
}

type SlateGame = Pick<ScoreboardGame, "id" | "status"> & {
  home: Pick<ScoreboardGame["home"], "id">;
  away: Pick<ScoreboardGame["away"], "id">;
};

/** The team's game in progress on today's slate, or null when it is not playing now. */
export function liveGame<G extends SlateGame>(teamId: string, slate: readonly G[]): G | null {
  return (
    slate.find(
      (game) => game.status === "live" && (game.home.id === teamId || game.away.id === teamId),
    ) ?? null
  );
}

/**
 * The game to show as the team's next: the one ESPN lists, while it is still to be played. The
 * team page is cached for an hour, so today's slate is asked whether that game has started.
 */
export function nextGame(listed: Game | null, slate: readonly SlateGame[]): Game | null {
  if (listed?.status !== "scheduled") return null;
  const today = slate.find((game) => game.id === listed.id);
  return today == null || today.status === "scheduled" ? listed : null;
}
