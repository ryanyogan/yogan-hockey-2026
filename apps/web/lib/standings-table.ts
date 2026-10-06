import type { StandingsTable } from "@yogan-hockey/schemas";

/** What a standings ledger works out from a `StandingsTable` before drawing it. */

const signed = new Intl.NumberFormat("en-US", { signDisplay: "exceptZero", useGrouping: false });

/** A goal difference with its sign: "+5", "-12", and a bare "0" when level. */
export function formatGoalDifference(difference: number): string {
  return signed.format(difference);
}

/** The `LedgerCell` tone that colours a goal difference: none when level. */
export function goalDifferenceTone(difference: number): "positive" | "negative" | "default" {
  if (difference > 0) return "positive";
  return difference < 0 ? "negative" : "default";
}

/**
 * The playoff line falls under this many rows, counted from the top; null where there is no line
 * to draw, which includes a table whose every row is above it (the wild card view's leaders).
 */
export function playoffLine(table: StandingsTable): number | null {
  const spots = table.playoffSpots;
  return spots != null && spots < table.rows.length ? spots : null;
}

/** "East" beside a division or a wild card table; nothing where the title already says. */
export function conferenceLabel(table: StandingsTable): string | undefined {
  if (table.conference == null || table.conference === table.title) return undefined;
  return table.rows[0]?.conference.abbreviation;
}
