import { createFileRoute } from "@tanstack/react-router";
import { LiveScores } from "../../../components/scoreboard/live-scores";
import { readLive } from "../../functions/live";
import { titled } from "../../head";

/**
 * `/nhl/live`: today's games. They come from the root route's Scoreboard and then its socket; the
 * route reads only their picks, from D1.
 */
export const Route = createFileRoute("/nhl/live")({
  loader: () => readLive(),
  head: ({ match }) => titled(match, "Live Scores"),
  component: LiveScoresPage,
});

function LiveScoresPage() {
  const { picks } = Route.useLoaderData();
  return <LiveScores picks={picks} />;
}
