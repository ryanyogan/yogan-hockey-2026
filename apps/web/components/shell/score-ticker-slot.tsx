import { ScoreTicker } from "../scoreboard/score-ticker";
import { ScoreboardNotice } from "../scoreboard/scoreboard-notice";
import { ScoreboardGate } from "../scoreboard/scoreboard-provider";

/**
 * The shared score grid, followed by a connection notice when needed. The shell streams first;
 * a typical nine-game outline holds room until the unknown slate arrives. An unusually short
 * or long slate can change this initial height, but navigation reuses the already mounted grid.
 */
export function ScoreTickerSlot() {
  return (
    <div data-slot="score-ticker" className="site-container score-ticker-slot empty:hidden">
      <ScoreboardGate
        fallback={
          <div aria-hidden="true" className="score-grid">
            {Array.from({ length: 9 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cells have no identity
              <div key={index} className="score-entry bg-panel" />
            ))}
          </div>
        }
      >
        <ScoreTicker />
      </ScoreboardGate>
      <ScoreboardNotice />
    </div>
  );
}
