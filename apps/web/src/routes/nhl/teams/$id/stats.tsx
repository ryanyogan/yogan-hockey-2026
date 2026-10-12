import { createFileRoute } from "@tanstack/react-router";
import { TeamStatsLedger } from "../../../../../components/team/team-stats-ledger";
import { readTeamStatsPage } from "../../../../functions/team";
import { failureTitled } from "../../../../head";

/** The Stats tab. */
export const Route = createFileRoute("/nhl/teams/$id/stats")({
  loader: ({ params }) => readTeamStatsPage({ data: { id: params.id } }),
  head: ({ match }) => failureTitled(match),
  component: TeamStatsPage,
});

function TeamStatsPage() {
  return <TeamStatsLedger detail={Route.useLoaderData()} />;
}
