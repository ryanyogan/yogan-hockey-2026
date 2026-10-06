import { notFound } from "next/navigation";
import { TeamStatsLedger } from "../../../../../components/team/team-stats-ledger";
import { loadTeam } from "../../../../../lib/find-team";

// Rendered per request; the ESPN reads behind it are cached and tagged (spec §2).
export const dynamic = "force-dynamic";

/** The Stats tab. The figures come with the team, which the layout has read already. */
export default async function TeamStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const detail = await loadTeam((await params).id);
  if (detail == null) notFound();
  return <TeamStatsLedger detail={detail} />;
}
