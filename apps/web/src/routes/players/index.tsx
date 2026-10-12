import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@yogan-hockey/ui/components/section";
import { Link } from "../../../components/link";
import { FavoritePlayers } from "../../../components/players/favorite-players";
import { PlayerSearch } from "../../../components/players/player-search";
import { MIN_SEARCH_LENGTH, readPlayersPage, unansweredSearch } from "../../../lib/player-search";
import { readPlayers } from "../../functions/players";
import { titled } from "../../head";

/** Player search and the visitor's favorite players. `?q=` holds the search. */
export const Route = createFileRoute("/players/")({
  loaderDeps: ({ search }) => readPlayersPage(search),
  loader: async ({ deps }) => {
    // A search starts at two characters: less is answered here, with nothing asked.
    if (deps.q.length < MIN_SEARCH_LENGTH) return unansweredSearch(deps.q);
    try {
      return await readPlayers({ data: deps });
    } catch (error) {
      // A page that cannot be rendered is the error page's. In the browser the call itself
      // failed (the network dropped, or the tab is older than a deploy that no longer knows the
      // call, which the server answers with a 500), under a page that is drawn already: the
      // search says it is not answering, and the box keeps what was typed.
      if (import.meta.env.SSR) throw error;
      return unansweredSearch(deps.q);
    }
  },
  // A search is asked for each time, as it was before the port: one that was not answering a
  // moment ago must not stay unanswered for five minutes. What was read last is drawn meanwhile.
  staleTime: 0,
  head: ({ match }) => titled(match, "Players"),
  component: PlayersPage,
});

function PlayersPage() {
  return (
    <>
      <section data-slot="player-search">
        <PageHeader title="Players" count="search the NHL">
          <Link href="/nhl?tab=teams" className="tap-target hover:underline">
            Browse a team's roster
          </Link>
        </PageHeader>
        <PlayerSearch initial={Route.useLoaderData()} />
      </section>
      <FavoritePlayers />
    </>
  );
}
