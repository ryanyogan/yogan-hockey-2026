import { ScoreTicker } from "../scoreboard/score-ticker";

/**
 * Where the score ticker sits: a strip across the top of the content column on every page, under
 * the top bar on a phone. It takes no room until the ticker has something to show.
 */
export function ScoreTickerSlot() {
  return (
    <div data-slot="score-ticker" className="border-rule border-b empty:hidden">
      <ScoreTicker />
    </div>
  );
}
