import type { Metadata } from "next";
import { LiveScores } from "../../../components/scoreboard/live-scores";
import { readSlatePicks } from "../../../lib/slate-picks";

export const metadata: Metadata = { title: "Live Scores" };
export const dynamic = "force-dynamic";

/**
 * Today's games. They come from the layout's Scoreboard connection; the page reads only their
 * picks, from D1.
 */
export default async function LiveScoresPage() {
  const { picks } = await readSlatePicks();
  return <LiveScores picks={picks} />;
}
