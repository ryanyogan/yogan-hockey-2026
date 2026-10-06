/**
 * Where the score ticker (#41) goes: a strip across the top of the content column on every page,
 * under the top bar on a phone. It takes no room until it has something in it.
 */
export function ScoreTickerSlot() {
  return <div data-slot="score-ticker" className="border-rule border-b empty:hidden" />;
}
