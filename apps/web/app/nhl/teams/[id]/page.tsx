import type { TeamDetail } from "@yogan-hockey/schemas";
import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FavoriteHeart } from "../../../../components/favorites/favorite-heart";
import { RosterLedger } from "../../../../components/team/roster-ledger";
import { ResultsLedger, UpcomingLedger } from "../../../../components/team/schedule-ledgers";
import { TeamHeader } from "../../../../components/team/team-header";
import { TeamNow } from "../../../../components/team/team-now";
import { TeamStatsLedger } from "../../../../components/team/team-stats-ledger";
import { cachedStandings, cachedTeamSchedule } from "../../../../lib/espn";
import { findTeam } from "../../../../lib/find-team";
import { rosterWithLegend } from "../../../../lib/legend";
import type { Query } from "../../../../lib/nhl-page";
import { sortRoster } from "../../../../lib/roster";
import { readTeamPage, TEAM_TABS, teamPageHref } from "../../../../lib/team-page";
import { scheduleView } from "../../../../lib/team-schedule";

// Rendered per request; the ESPN reads behind it are cached and tagged (spec §2).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Query> };

// The title and the page both want the team: one read for the two of them.
const loadTeam = cache(findTeam);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await loadTeam((await params).id);
  // A missing team's title is `not-found.tsx`'s; this one is never shown.
  return { title: detail?.team.name ?? "Team not found" };
}

export default async function TeamPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await loadTeam(id);
  if (detail == null) notFound();

  const { tab } = readTeamPage(query);
  const standings = await cachedStandings();
  const standing = standings.rows.find((row) => row.team.id === id) ?? null;

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-2">
        <TeamHeader
          detail={detail}
          standing={standing}
          // In line with the hearts of the roster's rows, which sit inside a cell's padding.
          action={<FavoriteHeart kind="team" id={id} name={detail.team.name} className="mr-2" />}
        />
        <TeamNow teamId={id} listed={detail.nextGame} />
      </div>
      <div className="space-y-2">
        <UrlTabs
          label="Team"
          link={Link}
          current={tab}
          tabs={TEAM_TABS.map((value) => ({
            value,
            label: value,
            href: teamPageHref(id, value),
          }))}
        />
        {tab === "roster" ? (
          <Roster detail={detail} />
        ) : tab === "stats" ? (
          <TeamStatsLedger detail={detail} />
        ) : (
          <Schedule teamId={id} />
        )}
      </div>
    </>
  );
}

function Roster({ detail }: { detail: TeamDetail }) {
  return (
    // Kept to the first of two columns from `xl` up: across the whole page a name is too far
    // from its position to read across.
    <div className="grid gap-8 xl:grid-cols-2">
      {/*
        The list given is the roster: a player put in front of the sorted list (#46) is drawn
        first and counted, and gets a heart like any other.
      */}
      <RosterLedger
        players={rosterWithLegend(detail.team.id, sortRoster(detail.roster))}
        action={(player) => <FavoriteHeart kind="player" id={player.id} name={player.name} />}
      />
    </div>
  );
}

// Read by its own component, so the Roster and Stats tabs never read the schedule.
async function Schedule({ teamId }: { teamId: string }) {
  const view = scheduleView(await cachedTeamSchedule(teamId));
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <UpcomingLedger rows={view.upcoming} postponed={view.postponed} />
      <ResultsLedger rows={view.results} wins={view.wins} losses={view.losses} />
    </div>
  );
}
