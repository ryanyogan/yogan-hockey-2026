import { createFileRoute } from "@tanstack/react-router";
import { LiveScores } from "../../../components/scoreboard/live-scores";
import { ScoreTicker } from "../../../components/scoreboard/score-ticker";
import { StaticScoreboard } from "../../../components/scoreboard/scoreboard-provider";
import { readSampleLive } from "../../functions/skeleton";
import { titled } from "../../head";

/*
 * Scaffolding for #41: the score ticker and `/nhl/live` drawn from an invented slate with a game
 * in every state, because no recorded ESPN slate has a game in progress. `?slate=empty` is a day
 * with no games and `?slate=quiet` one with two. The shell's own ticker, above, still shows the
 * real slate. It goes with `/skeleton/dashboard` once a recorded slate has live games.
 */
export const Route = createFileRoute("/skeleton/live")({
  loaderDeps: ({ search }: { search: Record<string, unknown> }) => ({
    slate: typeof search.slate === "string" ? search.slate : undefined,
  }),
  loader: ({ deps }) => readSampleLive({ data: deps }),
  head: ({ match }) => titled(match, "Sample live scores"),
  component: SampleLiveScoresPage,
});

function SampleLiveScoresPage() {
  const scoreboard = Route.useLoaderData();
  return (
    <StaticScoreboard scoreboard={scoreboard}>
      {/* The sample uses the same boxed edges as the production score grid. */}
      <div data-slot="sample-score-ticker" className="border border-rule">
        <ScoreTicker />
      </div>
      <LiveScores />
    </StaticScoreboard>
  );
}
