import type { MadeSlatePick } from "@yogan-hockey/schemas";
import type { Metadata } from "next";
import { Dashboard } from "../../../components/dashboard/dashboard";
import { StaticScoreboard } from "../../../components/scoreboard/scoreboard-provider";
import { EMPTY_SLATE, SAMPLE_SLATE } from "../live/sample-slate";
import { AGATE_SLATES } from "./agate-slates";

export const metadata: Metadata = { title: "Sample dashboard" };

export const dynamic = "force-dynamic";

/**
 * A pick for the home side of every other game of the invented slate, so each state is drawn
 * with a pick and without one, and the finals are marked both ways.
 */
const SAMPLE_PICKS: Record<string, MadeSlatePick> = Object.fromEntries(
  SAMPLE_SLATE.games
    .filter((_, index) => index % 2 === 0)
    .map((game) => [game.id, { status: "made", pickTeamId: game.home.id, winProbability: 58 }]),
);

/*
 * Scaffolding: Home drawn from a slate that is not today's, because no recorded ESPN slate has a
 * game in progress. The favorite players and the standings are the real ones, and the masthead
 * above still shows the real slate.
 *
 * - no `slate`: the invented slate of `/skeleton/live`, which has a game in every state.
 *   `?picks=1` gives half its games a pick and the season a record.
 * - `?slate=empty`: a day with no games.
 * - `?slate=tonight` and `?slate=busy`: the Agate prototype's two slates with their picks and
 *   records, which `scripts/agate-home-compare.mjs` measures against the prototype.
 */
export default async function SampleDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ slate?: string; picks?: string }>;
}) {
  const { slate, picks } = await searchParams;
  const agate = slate == null ? undefined : AGATE_SLATES[slate];
  if (agate) {
    return (
      <StaticScoreboard scoreboard={agate.scoreboard}>
        <Dashboard picks={agate.picks} record={agate.record} />
      </StaticScoreboard>
    );
  }
  return (
    <StaticScoreboard scoreboard={slate === "empty" ? EMPTY_SLATE : SAMPLE_SLATE}>
      {picks ? <Dashboard picks={SAMPLE_PICKS} record={{ right: 34, wrong: 21 }} /> : <Dashboard />}
    </StaticScoreboard>
  );
}
