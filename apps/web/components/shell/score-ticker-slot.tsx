import { TICKER_STRIP_HEIGHT } from "../../lib/scoreboard-view";
import { ScoreTicker } from "../scoreboard/score-ticker";
import { ScoreboardNotice } from "../scoreboard/scoreboard-notice";
import { ScoreboardGate } from "../scoreboard/scoreboard-provider";
import { ScoreStripPlace } from "./masthead-client";

/**
 * Where the score strip sits: under the masthead's dateline on every page but Home, whose stories
 * are the scores, with a hairline beneath it. Under it, on any page, a line for when the scores
 * have stopped arriving.
 *
 * The games stream in behind the page's shell (the layout does not wait for the Scoreboard) or,
 * on a page served from the page cache, arrive on the socket, and until they do an empty strip of
 * the ticker's height holds its place, so nothing under it moves when they arrive. Only a
 * Scoreboard with no slate at all, which is one that could not be read, leaves the slot empty and
 * gives the room back.
 */
export function ScoreTickerSlot() {
  return (
    <>
      <ScoreStripPlace>
        <div data-slot="score-ticker" className="border-rule-head border-b empty:hidden">
          <ScoreboardGate fallback={<div aria-hidden="true" className={TICKER_STRIP_HEIGHT} />}>
            <ScoreTicker />
          </ScoreboardGate>
        </div>
      </ScoreStripPlace>
      <ScoreboardNotice />
    </>
  );
}
