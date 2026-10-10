import type { Metadata } from "next";
import { Dashboard } from "../../../components/dashboard/dashboard";
import { StaticScoreboard } from "../../../components/scoreboard/scoreboard-provider";
import { EMPTY_SLATE, SAMPLE_SLATE } from "../live/sample-slate";

export const metadata: Metadata = { title: "Sample dashboard" };

export const dynamic = "force-dynamic";

/**
 * The three games still to be played, as the picks will say them: one made, one pending, and
 * one with no entry, which is a Prediction that failed and says nothing.
 */
const SAMPLE_PICKS = Object.fromEntries(
  SAMPLE_SLATE.games
    .filter((game) => game.status === "scheduled")
    .map((game, index) => [game.id, [`${game.home.abbreviation} 58%`, "pick pending"][index]])
    .filter(([, pick]) => pick != null),
);

/*
 * Scaffolding for #47: the dashboard drawn from the invented slate of `/skeleton/live`, which has
 * a game in every state, because no recorded ESPN slate has a game in progress. The favorite
 * players and the standings are the real ones. `?slate=empty` is a day with no games;
 * `?picks=1` fills the two places the picks go, with invented picks. The shell's own ticker,
 * above, still shows the real slate.
 */
export default async function SampleDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ slate?: string; picks?: string }>;
}) {
  const { slate, picks } = await searchParams;
  return (
    <StaticScoreboard scoreboard={slate === "empty" ? EMPTY_SLATE : SAMPLE_SLATE}>
      {picks ? (
        <Dashboard picks={SAMPLE_PICKS} record="picks: 34 right, 21 wrong" />
      ) : (
        <Dashboard />
      )}
    </StaticScoreboard>
  );
}
