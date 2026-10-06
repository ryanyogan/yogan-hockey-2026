import { createDb } from "@yogan-hockey/db";
import { getScoreboard as fetchScoreboard } from "@yogan-hockey/espn";
import type { Game, ScoreboardState } from "@yogan-hockey/schemas";
import {
  invalidateForFinal,
  invalidateStandingsAndTeams,
  rereadArchivedPlays,
  saveFinal,
  teamIdsOf,
} from "./final-game";
import {
  dayAfter,
  missedDates,
  type SlateTransition,
  scoreboardGame,
  scoreboardPollSeconds,
  slateTransitions,
} from "./slate";
import { ViewerPolledAgent } from "./viewer-polled-agent";

/** How long after a final the standings and both teams are invalidated a second time. */
const SECOND_INVALIDATION_SECONDS = 5 * 60;
/** How long after a final the game's archived plays are read from ESPN again. */
const PLAYS_REREAD_SECONDS = 24 * 60 * 60;
/** How many missed dates one catch-up fetches. A longer gap is finished on later polls. */
const CATCH_UP_DATES_PER_RUN = 30;
/** How many times a final's work is tried before it is given up on. */
const FINAL_ATTEMPTS = 3;
/** How many times in a row catch-up tries a date that fails before it goes on to the next. */
const CATCH_UP_DATE_ATTEMPTS = 3;

/** Storage key prefix of a final whose work is not finished, followed by the game's id. */
const PENDING_FINAL_PREFIX = "pending-final:";
/** Storage key of the oldest date a catch-up has still to fetch (`YYYY-MM-DD`). */
const CATCH_UP_FROM_KEY = "catch-up-from";
/** Storage key of how many times in a row catch-up has failed at the date it starts from. */
const CATCH_UP_FAILURES_KEY = "catch-up-failures";

/** A game that went final, kept in storage until its work is done. */
type PendingFinal = { game: Game; attempts: number };
/** What the second invalidation, five minutes after a final, is handed. */
type SecondInvalidation = { gameId: string; teamIds: string[] };
/** What the re-read of a game's plays, a day after its final, is handed. */
type PlaysReread = { gameId: string };

/**
 * The Scoreboard (spec section 4): today's games, pushed to every open page. One instance, named by
 * `SCOREBOARD_CONNECTION`. It polls ESPN only while a page is connected.
 *
 * A poll only notes what there is to do about finished games: a final it has just seen, and dates
 * it missed while nobody was watching. The work is done by one-off timers set for at once
 * (`recordFinals`, `catchUp`), so first paint never waits on it, and what is noted is in storage
 * until it is done, so a failure or a restart loses none of it: the next good poll sets the timer
 * again.
 */
export class ScoreboardAgent extends ViewerPolledAgent<ScoreboardState> {
  initialState: ScoreboardState = { date: null, games: [], updatedAt: null, invalidatedAt: null };

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
      this.setState({ ...previous, date: slate.date, games, updatedAt: new Date().toISOString() });
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
   * Called after every good poll, with the games that went final or were seen for the first time
   * (empty on most polls). State has already moved on, so a transition is handed over once: a
   * final is put in storage here, before anything can fail, and worked off by `recordFinals`.
   */
  protected async onSlateTransitions(transitions: SlateTransition[]): Promise<void> {
    for (const { kind, game } of transitions) {
      if (kind !== "went-final") continue;
      const pending: PendingFinal = { game, attempts: 0 };
      this.ctx.storage.kv.put(PENDING_FINAL_PREFIX + game.id, pending);
    }
    for (const { kind, game } of transitions) {
      if (kind !== "first-seen") continue;
      try {
        await this.startPrediction(game);
      } catch (error) {
        console.error(`Scoreboard: game ${game.id}'s Prediction was not started`, error);
      }
    }
    // Every good poll looks, not only one that found something: this is the retry.
    if (this.#pendingFinals().length > 0) await this.#runAtOnce("recordFinals");
    if (this.#catchUpDates().length > 0) await this.#runAtOnce("catchUp");
  }

  /**
   * Called when a poll finds ESPN on a later slate than the last one seen, with both dates
   * (`YYYY-MM-DD`): the dates from `from` up to the day before `to` may hold games that ended
   * with nobody watching. `from` is noted as where catch-up starts, unless an unfinished
   * catch-up already starts earlier.
   */
  protected async onSlateDateChange(from: string, to: string): Promise<void> {
    if (from >= to) return;
    const noted = this.ctx.storage.kv.get<string>(CATCH_UP_FROM_KEY);
    if (noted === undefined || from < noted) this.ctx.storage.kv.put(CATCH_UP_FROM_KEY, from);
  }

  /**
   * Seam for the Predictions (#52): called once for each game the first time it is seen on
   * today's slate, which is where the game's Prediction is started in the background. It is
   * awaited, so anything slow belongs behind a timer or a queue, not in here. The game may
   * already be live or final when it is first seen. A throw is logged and the game is not handed
   * over again, so whatever must not be lost has to be kept by the implementation.
   */
  protected async startPrediction(_game: Game): Promise<void> {}

  /**
   * A timer's callback, not for calling. Does the work of every final in storage (spec section
   * 4): the row in D1, the two timers, the invalidations, and telling open pages. Every step is
   * safe to repeat. A final whose work fails stays in storage for the next good poll, and is
   * given up on after `FINAL_ATTEMPTS` tries; its row is then written by the next catch-up.
   */
  async recordFinals(): Promise<void> {
    const finals = this.#pendingFinals();
    const db = createDb(this.env.DB);
    let invalidated = false;
    for (const [key, { game, attempts }] of finals) {
      try {
        await saveFinal(db, game);
        const teamIds = teamIdsOf(game);
        // Idempotent: a second try finds the timers the first one set, while they are waiting.
        const once = { idempotent: true };
        const again: SecondInvalidation = { gameId: game.id, teamIds };
        await this.schedule(SECOND_INVALIDATION_SECONDS, "invalidateAgain", again, once);
        const reread: PlaysReread = { gameId: game.id };
        await this.schedule(PLAYS_REREAD_SECONDS, "rereadPlays", reread, once);
        // From here on some tags are invalidated even if the rest of it fails.
        invalidated = true;
        await invalidateForFinal(game);
        this.ctx.storage.kv.delete(key);
      } catch (error) {
        const tries = attempts + 1;
        if (tries < FINAL_ATTEMPTS) {
          const pending: PendingFinal = { game, attempts: tries };
          this.ctx.storage.kv.put(key, pending);
          console.error(`Scoreboard: game ${game.id}'s final is not finished`, error);
        } else {
          this.ctx.storage.kv.delete(key);
          console.error(`Scoreboard: game ${game.id}'s final was given up on`, error);
        }
      }
    }
    if (invalidated) this.#tellPages();
    // A poll during the work above may have noted a final and found this timer still set. Such
    // a final gets a timer of its own; one that failed here waits for the next good poll.
    const taken = new Set(finals.map(([key]) => key));
    if (this.#pendingFinals().some(([key]) => !taken.has(key))) {
      await this.schedule(0, "recordFinals");
    }
  }

  /**
   * A timer's callback, not for calling. Five minutes after a final ESPN's standings and records
   * have caught up with it, so the standings and both teams are invalidated a second time.
   */
  async invalidateAgain({ teamIds }: SecondInvalidation): Promise<void> {
    await invalidateStandingsAndTeams(teamIds);
    this.#tellPages();
  }

  /**
   * A timer's callback, not for calling. A day after a final, reads the game's plays from ESPN
   * into D1 again if they were archived.
   */
  async rereadPlays({ gameId }: PlaysReread): Promise<void> {
    await rereadArchivedPlays(createDb(this.env.DB), gameId);
  }

  /**
   * A timer's callback, not for calling. Catch-up (spec section 4): fetches the scoreboard of
   * each date missed while nobody was watching, oldest first and at most
   * `CATCH_UP_DATES_PER_RUN` of them, writes the finished games' rows, then invalidates the
   * standings and the teams that played. Where it starts next moves on only after that, so the
   * rest of a gap too long for one run, and a date that failed, are taken up by the next good
   * poll. A date that fails `CATCH_UP_DATE_ATTEMPTS` times in a row is passed over, so one bad
   * date cannot hold up the dates after it for good.
   */
  async catchUp(): Promise<void> {
    const db = createDb(this.env.DB);
    const teamIds = new Set<string>();
    let next = this.ctx.storage.kv.get<string>(CATCH_UP_FROM_KEY);
    let failures = this.ctx.storage.kv.get<number>(CATCH_UP_FAILURES_KEY) ?? 0;
    for (const date of this.#catchUpDates()) {
      try {
        const slate = await fetchScoreboard(date);
        const finals = slate.games.filter((game) => game.status === "final");
        for (const game of finals) await saveFinal(db, game);
        for (const game of finals) for (const teamId of teamIdsOf(game)) teamIds.add(teamId);
        failures = 0;
      } catch (error) {
        failures += 1;
        const givenUp = failures >= CATCH_UP_DATE_ATTEMPTS;
        const outcome = givenUp ? "was given up on" : "is not finished";
        console.error(`Scoreboard: catch-up for ${date} ${outcome}`, error);
        if (!givenUp) break;
        failures = 0;
      }
      next = dayAfter(date);
    }
    try {
      if (teamIds.size > 0) await invalidateStandingsAndTeams(teamIds);
    } catch (error) {
      // Nothing moves on: the next run writes the rows and invalidates the tags again.
      console.error("Scoreboard: catch-up could not invalidate what it recorded", error);
      return;
    }
    const today = this.state.date;
    if (next === undefined || (today !== null && next >= today)) {
      this.ctx.storage.kv.delete(CATCH_UP_FROM_KEY);
    } else {
      this.ctx.storage.kv.put(CATCH_UP_FROM_KEY, next);
    }
    this.ctx.storage.kv.put(CATCH_UP_FAILURES_KEY, failures);
    if (teamIds.size > 0) this.#tellPages();
  }

  /** Every final in storage, with its key. */
  #pendingFinals(): [string, PendingFinal][] {
    return [...this.ctx.storage.kv.list<PendingFinal>({ prefix: PENDING_FINAL_PREFIX })];
  }

  /** The dates the next catch-up fetches. None when there is nothing to catch up on. */
  #catchUpDates(): string[] {
    const from = this.ctx.storage.kv.get<string>(CATCH_UP_FROM_KEY);
    const today = this.state.date;
    if (from === undefined || today === null) return [];
    return missedDates(from, today, CATCH_UP_DATES_PER_RUN);
  }

  /** Sets a one-off timer for now, unless one for the same callback is already waiting. */
  async #runAtOnce(callback: "recordFinals" | "catchUp"): Promise<void> {
    await this.schedule(0, callback, undefined, { idempotent: true });
  }

  /**
   * Tells open pages that cached data was invalidated, by moving `invalidatedAt` in the state
   * every page is sent. A page re-renders when it sees the change.
   */
  #tellPages(): void {
    this.setState({ ...this.state, invalidatedAt: new Date().toISOString() });
  }
}
