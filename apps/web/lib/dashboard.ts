import {
  type ScoreboardGame,
  type Standings,
  type StandingsTable,
  standingsView,
} from "@yogan-hockey/schemas";

/**
 * Keep each home row in scheduled-start order as status, scores and favorites change.
 * Game ids break ties so an upstream array reorder does not move equal-start games.
 */
export function tonightGames(games: readonly ScoreboardGame[]): ScoreboardGame[] {
  return games.toSorted(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) || a.id.localeCompare(b.id),
  );
}

/** "6 games, 2 live", the count beside "Tonight". Null on a day with no games. */
export function tonightSummary(games: readonly ScoreboardGame[]): string | null {
  if (games.length === 0) return null;
  const live = games.filter((game) => game.status === "live").length;
  const count = `${games.length} game${games.length === 1 ? "" : "s"}`;
  return live > 0 ? `${count}, ${live} live` : count;
}

/** How many favorite players the dashboard lists. */
export const DASHBOARD_FAVORITES = 4;

/** The game in progress a team is in, which is what puts "live" beside a favorite player. */
export function gamePlayingNow(
  teamId: string | undefined,
  games: readonly ScoreboardGame[],
): ScoreboardGame | undefined {
  if (teamId == null) return undefined;
  return games.find(
    (game) => game.status === "live" && (game.away.id === teamId || game.home.id === teamId),
  );
}

/** How many teams of each conference the dashboard lists, as the Parity Reference did. */
export const DASHBOARD_STANDINGS_ROWS = 8;

/** The dashboard's standings: each conference's best teams by points, one table a conference. */
export function topOfConferences(
  standings: Standings,
  rows: number = DASHBOARD_STANDINGS_ROWS,
): StandingsTable[] {
  return standingsView(standings, "conference").map((table) => ({
    ...table,
    rows: table.rows.slice(0, rows),
  }));
}
