import type { TeamDetail } from "@yogan-hockey/schemas";
import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { RosterLedger } from "../../../../components/team/roster-ledger";
import { ResultsLedger, UpcomingLedger } from "../../../../components/team/schedule-ledgers";
import { TeamHeader } from "../../../../components/team/team-header";
import { NextGame, TeamLiveBanner } from "../../../../components/team/team-now";
import { TeamStatsLedger } from "../../../../components/team/team-stats-ledger";
import { cachedStandings, cachedTeamSchedule } from "../../../../lib/espn";
import { findTeam } from "../../../../lib/find-team";
import type { Query } from "../../../../lib/nhl-page";
import { sortRoster } from "../../../../lib/roster";
import { readScoreboard } from "../../../../lib/scoreboard";
import { readTeamPage, TEAM_TABS, teamPageHref } from "../../../../lib/team-page";
import { nextGame, scheduleView } from "../../../../lib/team-schedule";

// Rendered per request; the ESPN reads behind it are cached and tagged (spec §2).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Query> };

// The title and the page both want the team: one read for the two of them.
const team = cache(findTeam);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await team((await params).id);
  return { title: detail?.team.name ?? "Team not found" };
}

export default async function TeamPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await team(id);
  if (detail == null) notFound();

  const { tab } = readTeamPage(query);
  const [standings, scoreboard] = await Promise.all([cachedStandings(), readScoreboard()]);
  const standing = standings.rows.find((row) => row.team.id === id) ?? null;
  const next = nextGame(detail.nextGame, scoreboard.games);

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-2">
        {/* The heart that makes the team a favorite (#45) is TeamHeader's `action`. */}
        <TeamHeader detail={detail} standing={standing} />
        <TeamLiveBanner teamId={id} games={scoreboard.games} />
        {next && <NextGame teamId={id} game={next} />}
      </div>
      <div className="space-y-2">
        <UrlTabs
          label="Team"
          link={Link}
          current={tab}
          tabs={TEAM_TABS.map((each) => ({
            value: each,
            label: each,
            href: teamPageHref(id, each),
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
  // The list is the roster: a player put in front of it (#46) is drawn first and counted.
  // Each row's heart (#45) is RosterLedger's `action`.
  return (
    // Kept to the first of two columns from `xl` up: across the whole page a name is too far
    // from its position to read across.
    <div className="grid gap-8 xl:grid-cols-2">
      <RosterLedger players={sortRoster(detail.roster)} />
    </div>
  );
}

// Read by its own component, so the Roster and Stats tabs never read the schedule.
async function Schedule({ teamId }: { teamId: string }) {
  const { upcoming, results, wins, losses } = scheduleView(await cachedTeamSchedule(teamId));
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <UpcomingLedger rows={upcoming} />
      <ResultsLedger rows={results} wins={wins} losses={losses} />
    </div>
  );
}
