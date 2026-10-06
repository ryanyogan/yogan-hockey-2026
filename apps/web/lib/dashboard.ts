import {
  type ScoreboardGame,
  type Standings,
  type StandingsTable,
  standingsView,
} from "@yogan-hockey/schemas";
import { favoritesFirst } from "./favorites";
import type { HeadlineStat } from "./player-view";
import { tickerGames } from "./scoreboard-view";

/**
 * Tonight's games in the dashboard's order: what is on, what is to come, what is over, and the
 * favorite teams' games ahead of all of them, in that same order among themselves.
 */
export function tonightGames(
  games: ScoreboardGame[],
  favoriteTeamIds: readonly string[],
): ScoreboardGame[] {
  return favoritesFirst(tickerGames(games), favoriteTeamIds);
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

/** The Family ledger's figures, as its column headers. */
export const FAMILY_COLUMNS = ["gp", "g", "a", "pts"] as const;

/** The Family ledger's four figures, in its columns' order, with a dash where a file has none. */
export function familyTotals(totals: readonly HeadlineStat[]): HeadlineStat[] {
  return FAMILY_COLUMNS.map((label) => ({
    label,
    value: totals.find((total) => total.label.toLowerCase() === label)?.value ?? "-",
  }));
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
