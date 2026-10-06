import type { RosterPlayer } from "@yogan-hockey/schemas";

/** A player's page. */
export function playerHref(player: Pick<RosterPlayer, "id">): string {
  return `/players/${player.id}`;
}

/** A roster in jersey order, lowest first. A player without a number goes last. */
export function sortRoster(roster: readonly RosterPlayer[]): RosterPlayer[] {
  const number = (player: RosterPlayer) =>
    player.jersey == null ? Number.POSITIVE_INFINITY : Number(player.jersey);
  // Equal numbers, and the numberless, stay in ESPN's order: `toSorted` is stable.
  return roster.toSorted((a, b) => {
    const [first, second] = [number(a), number(b)];
    return first === second ? 0 : first - second;
  });
}
