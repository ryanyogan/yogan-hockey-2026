import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@yogan-hockey/ui/components/section";
import { useEffect } from "react";
import { Link } from "../../../components/link";
import { PlayerSearch } from "../../../components/players/player-search";
import { readPlayersPage, searchLoading } from "../../../lib/player-search";
import { readPlayers } from "../../functions/players";
import { titled } from "../../head";

/**
 * How the search is loaded (`searchLoading`): around the page's one server function, with what a
 * browser adds to it. One for the whole of a visit, which is what remembers a search that was not
 * answering.
 */
const loading = searchLoading(
  (page) => readPlayers({ data: page }),
  import.meta.env.SSR
    ? null
    : { online: () => navigator.onLine, reload: () => window.location.reload() },
);

/** Player search. `?q=` holds the search. */
export const Route = createFileRoute("/players/")({
  loaderDeps: ({ search }) => readPlayersPage(search),
  // A search asked for again is waited for, as one never asked is: the page that is drawn stays
  // until its answer is in, and "not answering" is not shown a second time on the way.
  loader: { handler: loading.loader, staleReloadMode: "blocking" },
  shouldReload: loading.shouldReload,
  head: ({ match }) => titled(match, "Players"),
  component: PlayersPage,
});

function PlayersPage() {
  const search = Route.useLoaderData();
  // The answer in a document's HTML was read on the server, which the browser's loading has not
  // seen: it is told, so that one that was not answering is asked for again here too.
  useEffect(() => {
    loading.drawn(search);
  }, [search]);
  return (
    <section data-slot="player-search">
      <PageHeader title="Players" count="search the NHL">
        <Link href="/nhl?tab=teams" className="tap-target hover:underline">
          Browse a team's roster
        </Link>
      </PageHeader>
      <PlayerSearch initial={search} />
    </section>
  );
}
