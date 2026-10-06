import { ScoreTicker } from "../scoreboard/score-ticker";
import { ScoreboardNotice } from "../scoreboard/scoreboard-notice";

/**
 * Where the score ticker sits: a strip across the top of the content column on every page, under
 * the top bar on a phone, and under it a line for when the scores have stopped arriving. It takes
 * no room until one of them has something to show.
 */
export function ScoreTickerSlot() {
  return (
    <div data-slot="score-ticker" className="border-rule border-b empty:hidden">
      <ScoreTicker />
      <ScoreboardNotice />
    </div>
  );
}
