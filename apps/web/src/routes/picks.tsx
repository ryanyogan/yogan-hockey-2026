import { createFileRoute } from "@tanstack/react-router";
import { PicksPage } from "../../components/picks/picks-page";
import { PICKS_TITLE } from "../../lib/picks-page-copy";
import { readPicksPage } from "../functions/picks";
import { titled } from "../head";

/**
 * `/picks`: how the site's picks have done this week and this season, tonight's picks and the
 * columns about them (#218). The loader reads all of it but tonight's games, which are the root
 * route's Scoreboard and then its socket.
 *
 * Until #218 this address was a JSON route kept from the vinext site (#192), which nothing asked.
 */
export const Route = createFileRoute("/picks")({
  loader: () => readPicksPage(),
  head: ({ match }) => titled(match, PICKS_TITLE),
  component: PicksRoute,
});

function PicksRoute() {
  return <PicksPage page={Route.useLoaderData()} />;
}
