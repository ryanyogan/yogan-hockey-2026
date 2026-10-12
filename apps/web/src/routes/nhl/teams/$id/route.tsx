import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { FavoriteHeart } from "../../../../../components/favorites/favorite-heart";
import { Link } from "../../../../../components/link";
import { TeamHeader } from "../../../../../components/team/team-header";
import { TeamNotFound } from "../../../../../components/team/team-not-found";
import { TeamNow } from "../../../../../components/team/team-now";
import { TeamNowFrame } from "../../../../../components/team/team-skeletons";
import { TeamTabs } from "../../../../../components/team/team-tabs";
import { readTeamPage } from "../../../../functions/team";
import { titled } from "../../../../head";

/**
 * What every tab of a team's page shares: the header with the team's record, what the team is
 * doing now, the tab bar, and the way back. Its loader reads the team once; the tabs beneath it
 * (`index.tsx` is the schedule, `roster.tsx` and `stats.tsx` the others) each read their own, so
 * changing tab asks the server for the tab and nothing else while this read is fresh.
 */
export const Route = createFileRoute("/nhl/teams/$id")({
  loader: ({ params }) => readTeamPage({ data: { id: params.id } }),
  head: ({ match, loaderData }) =>
    titled(match, loaderData?.team.name, { notFound: "Team not found" }),
  component: TeamPage,
  notFoundComponent: TeamNotFound,
});

function TeamPage() {
  const read = Route.useLoaderData();
  const { id } = Route.useParams();
  // A tab whose read failed is the whole page's failure: the error page stands alone in the
  // shell, under no header, as it does when the team itself could not be read.
  const tabFailed = useChildMatches({
    select: (matches) => matches.some((match) => match.status === "error"),
  });
  if (tabFailed) return <Outlet />;

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        <TeamHeader
          detail={read}
          standing={read.standing}
          // Not squeezed by a long name, which would cost its reach a pixel. It ends on the
          // column's edge, where the rules end and a roster's hearts are; its reach runs 8px
          // into the gutter.
          action={
            <FavoriteHeart
              kind="team"
              id={read.team.id}
              name={read.team.name}
              className="shrink-0"
            />
          }
        />
        {/* The same full-width, live-ledger-sized slot whatever the team is doing. */}
        <TeamNowFrame>
          <TeamNow teamId={id} listed={read.nextGame} picks={read.picks} />
        </TeamNowFrame>
      </div>
      <div className="space-y-3">
        <TeamTabs teamId={id} />
        <Outlet />
      </div>
      {/* The foot of the page on every tab, as the player page has "back to players". */}
      <p className="font-label text-small uppercase tracking-head">
        <Link href="/nhl" className="tap-target underline">
          back to NHL
        </Link>
      </p>
    </>
  );
}
