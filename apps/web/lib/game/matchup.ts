import type { PregameGoalie, PregameStanding, RecentGame } from "@yogan-hockey/schemas";

const ORDINALS = new Intl.PluralRules("en", { type: "ordinal" });
const SUFFIX: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };

/** "3rd Atlantic": where a team sits in its division. A dash before ESPN has a standing. */
export function standingLine(standing: PregameStanding | null): string {
  if (standing == null) return "-";
  const suffix = SUFFIX[ORDINALS.select(standing.position)] ?? "th";
  return `${standing.position}${suffix} ${standing.division.replace(/ Division$/, "")}`;
}

/** "W L L W W", oldest first. A dash when ESPN sends none, as it does once a game starts. */
export function lastFiveLine(games: readonly RecentGame[]): string {
  return games.map((game) => game.result).join(" ") || "-";
}

/** "21-8-3"; a dash for a goalie yet to play. */
export function goalieRecord(goalie: PregameGoalie): string {
  if (goalie.wins == null || goalie.losses == null) return "-";
  return `${goalie.wins}-${goalie.losses}-${goalie.otLosses ?? 0}`;
}

/** ".926" from 0.926. */
export function savePct(value: number | null): string {
  return value == null ? "-" : value.toFixed(3).replace(/^0/, "");
}
