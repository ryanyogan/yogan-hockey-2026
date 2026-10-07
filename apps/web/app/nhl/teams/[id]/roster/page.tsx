import { FavoriteHeart } from "../../../../../components/favorites/favorite-heart";
import { RosterLedger } from "../../../../../components/team/roster-ledger";
import { loadTeam } from "../../../../../lib/find-team";
import { rosterWithLegend } from "../../../../../lib/legend";
import { pageNotFound } from "../../../../../lib/page-not-found";
import { sortRoster } from "../../../../../lib/roster";

// Rendered per request; the ESPN reads behind it are cached and tagged (spec §2).
export const dynamic = "force-dynamic";

/** The Roster tab. The roster comes with the team, which the layout has read already. */
export default async function TeamRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const detail = await loadTeam((await params).id);
  if (detail == null) pageNotFound();
  return (
    // Kept to the first of two columns from `xl` up: across the whole page a name is too far
    // from its position to read across.
    <div className="grid gap-8 xl:grid-cols-2">
      {/*
        The list given is the roster: a player put in front of the sorted list (#46) is drawn
        first and counted, and gets a heart like any other.
      */}
      <RosterLedger
        players={rosterWithLegend(detail.team.id, sortRoster(detail.roster))}
        action={(player) => <FavoriteHeart kind="player" id={player.id} name={player.name} />}
      />
    </div>
  );
}
