import { getGameSummary } from "@yogan-hockey/espn";
import type { Metadata } from "next";
import { GameView } from "../../../components/game/game-view";
import { gameTabFrom } from "../../../lib/game/tabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sample game" };

/** Dallas at Buffalo, 2 April 2026: decided in a shootout, and recorded as a fixture. */
const SAMPLE_GAME = "401803652";

/*
 * Scaffolding for #49: the rink, the timeline and the tabs drawn from one finished game, so they
 * can be seen and compared with the Reference UI (docs/design/game) before the game page exists.
 * `?live=1` shows the same game as if it were still being played, for the live overlay. It goes
 * when `/nhl/games/:id` is built.
 */
export default async function SampleGamePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; live?: string }>;
}) {
  const [{ tab, live }, summary] = await Promise.all([searchParams, getGameSummary(SAMPLE_GAME)]);
  const header =
    live == null
      ? summary.header
      : { ...summary.header, status: "live" as const, period: 3, clock: "6:51" };
  return (
    <GameView
      header={header}
      plays={summary.plays}
      tab={gameTabFrom(tab)}
      pathname="/skeleton/game"
      pick={
        <p className="max-w-prose text-foreground/70">
          The pick is drawn here by the game page, once Predictions are on the site.
        </p>
      }
    />
  );
}
