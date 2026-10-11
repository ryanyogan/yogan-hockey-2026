import { TICKER_STRIP_HEIGHT } from "../../lib/scoreboard-view";
import { ScoreTicker } from "../scoreboard/score-ticker";
import { ScoreboardNotice } from "../scoreboard/scoreboard-notice";
import { ScoreboardGate } from "../scoreboard/scoreboard-provider";

/**
 * Where the score ticker sits: a strip across the top of the content column on every page, under
 * the top bar on a phone, and under it a line for when the scores have stopped arriving.
 *
 * The games stream in behind the page's shell (the layout does not wait for the Scoreboard) or,
 * on a page served from the page cache, arrive on the socket, and until they do an empty strip of the ticker's height holds its place, so nothing under it moves
 * when they arrive. Only a Scoreboard with no slate at all, which is one that could not be read,
 * leaves the slot empty and gives the room back.
 */
export function ScoreTickerSlot() {
  return (
    <div data-slot="score-ticker" className="border-rule border-b empty:hidden">
      <ScoreboardGate fallback={<div aria-hidden="true" className={TICKER_STRIP_HEIGHT} />}>
        <ScoreTicker />
      </ScoreboardGate>
      <ScoreboardNotice />
    </div>
  );
}
