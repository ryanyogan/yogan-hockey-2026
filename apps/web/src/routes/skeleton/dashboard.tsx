import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "../../../components/dashboard/dashboard";
import { StaticScoreboard } from "../../../components/scoreboard/scoreboard-provider";
import { readSampleDashboard } from "../../functions/skeleton";
import { titled } from "../../head";

/*
 * Scaffolding: Home drawn from a slate that is not today's, because no recorded ESPN slate has a
 * game in progress. The favorite players and the standings are the real ones, and the masthead
 * above still shows the real slate. `?slate=` and `?picks=1` choose the sample
 * (`readSampleDashboard`).
 */
export const Route = createFileRoute("/skeleton/dashboard")({
  loaderDeps: ({ search }: { search: Record<string, unknown> }) => ({
    slate: typeof search.slate === "string" ? search.slate : undefined,
    // Anything given for `picks` is yes, as it was when the address was read as text.
    picks: "picks" in search && search.picks !== "",
  }),
  loader: ({ deps }) => readSampleDashboard({ data: deps }),
  head: ({ match }) => titled(match, "Sample dashboard"),
  component: SampleDashboardPage,
});

function SampleDashboardPage() {
  const { scoreboard, picks, record, standings } = Route.useLoaderData();
  return (
    <StaticScoreboard scoreboard={scoreboard}>
      <Dashboard picks={picks} record={record} standings={standings} />
    </StaticScoreboard>
  );
}
