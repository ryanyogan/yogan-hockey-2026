import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FavoriteHeart } from "../../../../components/favorites/favorite-heart";
import { Link } from "../../../../components/link";
import { ScoreboardGate } from "../../../../components/scoreboard/scoreboard-provider";
import { TeamHeader } from "../../../../components/team/team-header";
import { TeamNow } from "../../../../components/team/team-now";
import { NextGameSkeleton } from "../../../../components/team/team-skeletons";
import { TeamTabs } from "../../../../components/team/team-tabs";
import { cachedStandings } from "../../../../lib/espn";
import { loadTeam } from "../../../../lib/find-team";
import { doNotKeepPage } from "../../../../lib/render-failure";

type Props = { params: Promise<{ id: string }>; children: ReactNode };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const detail = await loadTeam((await params).id);
  // A missing team's title is `not-found.tsx`'s; this one is never shown.
  return { title: detail?.team.name ?? "Team not found" };
}

/**
 * What every tab of a team's page shares: the header with the team's record, what the team is
 * doing now, the tab bar, and the way back. It is rendered once and stays put while the tabs'
 * pages change beneath it (`page.tsx` is the schedule, `roster/` and `stats/` the others).
 *
 * It waits for two reads, both answered from the cache (spec section 2): the team, and the
 * standings for its conference and division. The header's height depends on them (a long name
 * wraps on a phone), so no placeholder could stand in for it without the page moving.
 *
 * The page is served from the page cache (`lib/page-cache.ts`), so nothing here may read what
 * changes by the minute: what the team is doing now comes from the Scoreboard's socket and its
 * pick from `GET /picks`, both after first paint, behind a placeholder of the card's size.
 */
/** A read that failed is drawn around, in a page the page cache must then not keep. */
function fallback(): null {
  doNotKeepPage();
  return null;
}

export default async function TeamLayout({ params, children }: Props) {
  const { id } = await params;
  const [detail, standings] = await Promise.all([
    // A layout that throws takes the whole shell with it (build notes, #84). The tab's page
    // makes the same read and reports its failure inside the shell, so here it only means
    // "no header".
    loadTeam(id).catch(fallback),
    // The header can do without its conference and division.
    cachedStandings().catch(fallback),
  ]);
  // No such team: the tab's page says so (`notFound()`), under no header.
  if (detail == null) return children;
  const standing = standings?.rows.find((row) => row.team.id === id) ?? null;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <TeamHeader
          detail={detail}
          standing={standing}
          // In line with the hearts of the roster's rows, which sit inside a cell's padding.
          action={
            <FavoriteHeart
              kind="team"
              id={detail.team.id}
              name={detail.team.name}
              className="mr-2"
            />
          }
        />
        <ScoreboardGate fallback={<NextGameSkeleton />}>
          <TeamNow teamId={id} listed={detail.nextGame} />
        </ScoreboardGate>
      </div>
      <div className="space-y-2">
        <TeamTabs teamId={id} />
        {children}
      </div>
      {/* The foot of the page on every tab, as the player page has "back to players". */}
      <p className="px-2">
        <Link href="/nhl" className="underline">
          back to NHL
        </Link>
      </p>
    </>
  );
}
