import { ResultsLedger, UpcomingLedger } from "../../../../../components/team/schedule-ledgers";
import { cachedTeamSchedule } from "../../../../../lib/espn";
import { loadTeam } from "../../../../../lib/find-team";
import { pageNotFound } from "../../../../../lib/page-not-found";
import { scheduleView } from "../../../../../lib/team-schedule";

// Rendered per request; the ESPN reads behind it are cached and tagged (spec §2).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * The Schedule tab, and a team's own address. The header and the tabs above it are the layout's;
 * `loading.tsx` stands here while the schedule is read.
 */
export default async function TeamSchedulePage({ params }: Props) {
  const { id } = await params;
  // Started before the team is known to exist, so the two reads run side by side. A team that
  // does not exist has no schedule either: that failure is heard here and never reported.
  const schedule = cachedTeamSchedule(id);
  schedule.catch(() => {});
  if ((await loadTeam(id)) == null) pageNotFound();

  const view = scheduleView(await schedule);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <UpcomingLedger rows={view.upcoming} postponed={view.postponed} />
      <ResultsLedger rows={view.results} wins={view.wins} losses={view.losses} />
    </div>
  );
}
