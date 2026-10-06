import { getScoreboard as fetchScoreboard } from "@yogan-hockey/espn";
import type { ScoreboardState } from "@yogan-hockey/schemas";
import {
  type SlateTransition,
  scoreboardGame,
  scoreboardPollSeconds,
  slateTransitions,
} from "./slate";
import { ViewerPolledAgent } from "./viewer-polled-agent";

/**
 * The Scoreboard (spec section 4): today's games, pushed to every open page. One instance, named by
 * `SCOREBOARD_CONNECTION`. It polls ESPN only while a page is connected.
 */
export class ScoreboardAgent extends ViewerPolledAgent<ScoreboardState> {
  initialState: ScoreboardState = { date: null, games: [], updatedAt: null };

  /**
   * First paint, called by a server component over Durable Object RPC. With nobody watching the
   * stored games are old, so this asks ESPN first when they are older than one polling interval.
   * If ESPN fails, the answer is the games as last seen.
   */
  async getScoreboard(): Promise<ScoreboardState> {
    await this.pollIfStale();
    return this.state;
  }

  protected override get alertSource(): string {
    return "Scoreboard";
  }

  protected override pollIntervalSeconds(): number {
    return scoreboardPollSeconds(this.state.games, Date.now());
  }

  protected override async poll(): Promise<void> {
    const slate = await fetchScoreboard();
    const previous = this.state;
    const games = slate.games.map(scoreboardGame);
    // State is sent whole to every open page, so it is set only when a poll finds a difference.
    if (slate.date !== previous.date || JSON.stringify(games) !== JSON.stringify(previous.games)) {
      this.setState({ date: slate.date, games, updatedAt: new Date().toISOString() });
    }
    // What follows is the site's own work, not ESPN's: a failure in it is not a failed poll.
    try {
      if (previous.date !== null && previous.date !== slate.date) {
        await this.onSlateDateChange(previous.date, slate.date);
      }
    } catch (error) {
      console.error("Scoreboard: the slate's date change was not handled", error);
    }
    try {
      await this.onSlateTransitions(slateTransitions(previous.games, slate));
    } catch (error) {
      console.error("Scoreboard: the slate's transitions were not handled", error);
    }
  }

  /**
   * Seam for #40 and the Predictions. Called after every good poll, with the games that went
   * final or were seen for the first time (empty on most polls). State has already moved on when
   * this runs, so a transition is handed over once: work that must not be lost to a failure here
   * has to be made safe to repeat and retried by whoever takes it on. A throw
   * from here is logged and goes no further.
   */
  protected async onSlateTransitions(_transitions: SlateTransition[]): Promise<void> {}

  /**
   * Seam for #40's catch-up. Called when a poll finds ESPN on a later slate than the last one
   * seen, with both dates (`YYYY-MM-DD`): the dates from `from` up to the day before `to` may hold
   * games that ended with nobody watching.
   */
  protected async onSlateDateChange(_from: string, _to: string): Promise<void> {}
}
