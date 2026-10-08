/** Today as an ISO day in UTC, which is how a Tracked Player's file dates its games. */
export const todayUtc = () => new Date().toISOString().slice(0, 10);

/**
 * The rows of games still to come on `today`: those dated today or later. A row's `key` is its
 * game's ISO date, and ISO dates compare as text. With no `today` every row is still to come.
 * Apart from `lib/tracked-players.ts`, so the browser's bundle holds no player's file.
 */
export function stillToCome<Row extends { key: string }>(rows: Row[], today?: string): Row[] {
  return today == null ? rows : rows.filter((row) => row.key >= today);
}
