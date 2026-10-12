import {
  type ScoreboardGame,
  type Standings,
  type StandingsTable,
  standingsView,
} from "@yogan-hockey/schemas";

/**
 * Keep each home row in scheduled-start order as status and scores change.
 * Game ids break ties so an upstream array reorder does not move equal-start games.
 */
export function tonightGames(games: readonly ScoreboardGame[]): ScoreboardGame[] {
  return games.toSorted(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime) || a.id.localeCompare(b.id),
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
