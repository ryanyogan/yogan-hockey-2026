import type { Metadata } from "next";
import { LiveScores } from "../../../components/scoreboard/live-scores";
import { ScoreTicker } from "../../../components/scoreboard/score-ticker";
import { StaticScoreboard } from "../../../components/scoreboard/scoreboard-provider";
import { EMPTY_SLATE, SAMPLE_SLATE } from "./sample-slate";

export const metadata: Metadata = { title: "Sample live scores" };

/*
 * Scaffolding for #41: the score ticker and `/nhl/live` drawn from an invented slate with a game
 * in every state, because no recorded ESPN slate has a game in progress. `?slate=empty` is a day
 * with no games. The shell's own ticker, above, still shows the real slate. It goes with
 * `/skeleton/ledger` once a recorded slate has live games.
 */
export default async function SampleLiveScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ slate?: string }>;
}) {
  const scoreboard = (await searchParams).slate === "empty" ? EMPTY_SLATE : SAMPLE_SLATE;
  return (
    <StaticScoreboard scoreboard={scoreboard}>
      {/* Pulled out to the edges of the content column, where the shell's ticker sits. */}
      <div
        data-slot="sample-score-ticker"
        className="-mx-4 -mt-4 border-rule border-b md:-mx-6 md:-mt-6"
      >
        <ScoreTicker />
      </div>
      <LiveScores />
    </StaticScoreboard>
  );
}
