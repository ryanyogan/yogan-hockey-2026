import { ScoreTicker } from "../scoreboard/score-ticker";
import { ScoreboardNotice } from "../scoreboard/scoreboard-notice";
import { ScoreStripPlace } from "./masthead-client";

/**
 * Where the score strip sits: under the masthead's dateline on every page but Home, whose stories
 * are the scores, with a hairline beneath it. Under it, on any page, a line for when the scores
 * have stopped arriving.
 *
 * The games are in the page from its first HTML (the root route's loader reads the Scoreboard),
 * so nothing holds the strip's place. Only a Scoreboard with no slate at all, which is one that
 * could not be read, leaves the slot empty and gives the room back.
 */
export function ScoreTickerSlot() {
  return (
    <>
      <ScoreStripPlace>
        <div data-slot="score-ticker" className="border-rule-head border-b empty:hidden">
          <ScoreTicker />
        </div>
      </ScoreStripPlace>
      <ScoreboardNotice />
    </>
  );
}
