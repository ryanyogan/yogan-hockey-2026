import { createFileRoute } from "@tanstack/react-router";
import { ResultsLedger, UpcomingLedger } from "../../../../../components/team/schedule-ledgers";
import { readTeamSchedulePage } from "../../../../functions/team";
import { failureTitled } from "../../../../head";

/** The Schedule tab, and a team's own address. The header and the tabs above it are the parent's. */
export const Route = createFileRoute("/nhl/teams/$id/")({
  loader: ({ params }) => readTeamSchedulePage({ data: { id: params.id } }),
  head: ({ match }) => failureTitled(match),
  component: TeamSchedulePage,
});

function TeamSchedulePage() {
  const view = Route.useLoaderData();
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <UpcomingLedger rows={view.upcoming} postponed={view.postponed} />
      <ResultsLedger rows={view.results} wins={view.wins} losses={view.losses} />
    </div>
  );
}
