import type { Metadata } from "next";
import { LiveScores } from "../../../components/scoreboard/live-scores";

export const metadata: Metadata = { title: "Live Scores" };
export const dynamic = "force-dynamic";

/** Today's games. They come from the layout's Scoreboard connection, so the page reads nothing. */
export default function LiveScoresPage() {
  return <LiveScores />;
}
