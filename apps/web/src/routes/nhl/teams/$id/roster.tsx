import { createFileRoute } from "@tanstack/react-router";
import { FavoriteHeart } from "../../../../../components/favorites/favorite-heart";
import { RosterLedger } from "../../../../../components/team/roster-ledger";
import { readTeamRosterPage } from "../../../../functions/team";
import { failureTitled } from "../../../../head";

/** The Roster tab. */
export const Route = createFileRoute("/nhl/teams/$id/roster")({
  loader: ({ params }) => readTeamRosterPage({ data: { id: params.id } }),
  head: ({ match }) => failureTitled(match),
  component: TeamRosterPage,
});

function TeamRosterPage() {
  const players = Route.useLoaderData();
  return (
    // Kept to the first of two columns from `xl` up: across the whole page a name is too far
    // from its position to read across.
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <RosterLedger
        players={players}
        action={(player) => <FavoriteHeart kind="player" id={player.id} name={player.name} />}
      />
    </div>
  );
}
