import type { Game } from "@yogan-hockey/schemas";
import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";
import { FavoriteHeart } from "../../../../components/favorites/favorite-heart";
import { Link } from "../../../../components/link";
import { TeamHeader } from "../../../../components/team/team-header";
import { TeamNow } from "../../../../components/team/team-now";
import { NextGameSkeleton } from "../../../../components/team/team-skeletons";
import { TeamTabs } from "../../../../components/team/team-tabs";
import { cachedStandings } from "../../../../lib/espn";
import { loadTeam } from "../../../../lib/find-team";
import { readSlatePicks } from "../../../../lib/slate-picks";

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
 * wraps on a phone), so no placeholder could stand in for it without the page moving. What the
 * team is doing now needs D1 and the Scoreboard as well, has one size, and streams in.
 */
export default async function TeamLayout({ params, children }: Props) {
  const { id } = await params;
  const [detail, standings] = await Promise.all([loadTeam(id), cachedStandings()]);
  // No such team: the tab's page says so (`notFound()`), under no header.
  if (detail == null) return children;
  const standing = standings.rows.find((row) => row.team.id === id) ?? null;

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-2">
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
        <Suspense fallback={<NextGameSkeleton />}>
          <Now teamId={id} listed={detail.nextGame} />
        </Suspense>
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

/** The picks are today's slate's, from D1; a read that fails gives none (`readSlatePicks`). */
async function Now({ teamId, listed }: { teamId: string; listed: Game | null }) {
  const { picks } = await readSlatePicks();
  return <TeamNow teamId={teamId} listed={listed} picks={picks} />;
}
