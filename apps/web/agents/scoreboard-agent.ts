import { createDb, type Db, getPrediction, insertPredictionIfAbsent } from "@yogan-hockey/db";
import { getScoreboard as fetchScoreboard, getGameSummary } from "@yogan-hockey/espn";
import type {
  Game,
  ScoreboardHeard,
  ScoreboardReading,
  ScoreboardState,
  StoredPrediction,
} from "@yogan-hockey/schemas";
import {
  invalidateForFinal,
  invalidateStandingsAndTeams,
  rereadArchivedPlays,
  saveFinal,
  teamIdsOf,
} from "./final-game";
import {
  AI_GATEWAY_ID,
  DAILY_MODEL_CALLS,
  FALLBACK_MODEL,
  MODEL_OF_EACH_CALL,
  type PredictionInputs,
  type PredictionRequest,
  predictionInputs,
  predictionRequest,
  readModelAnswer,
  teamsOf,
} from "./prediction";
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
/** How many times a game's pre-game facts are asked of ESPN before its Prediction is given up on. */
const PREGAME_ATTEMPTS = 3;
/** How long a game waits before its pre-game facts are asked of ESPN again. */
const PREGAME_RETRY_SECONDS = 60;
/** How long one model call may take. A call that hangs would hold up every other timer. */
const MODEL_CALL_TIMEOUT_MS = 90 * 1000;

/** Storage key prefix of a final whose work is not finished, followed by the game's id. */
const PENDING_FINAL_PREFIX = "pending-final:";
/** Storage key of the oldest date a catch-up has still to fetch (`YYYY-MM-DD`). */
const CATCH_UP_FROM_KEY = "catch-up-from";
/** Storage key of when a poll last reached ESPN, changed or not (an ISO time, UTC). */
const HEARD_AT_KEY = "heard-at";
/** Storage key of how many times in a row catch-up has failed at the date it starts from. */
const CATCH_UP_FAILURES_KEY = "catch-up-failures";
/** Storage key prefix of a game whose Prediction is not settled yet, followed by the game's id. */
const PENDING_PREDICTION_PREFIX = "pending-prediction:";
/** Storage key of the count of model calls made on the current slate's date. */
const MODEL_CALLS_KEY = "model-calls";

/** A game that went final, kept in storage until its work is done. */
type PendingFinal = { game: Game; attempts: number };
/**
 * A game whose Prediction is being made, kept in storage until its row is in D1. Everything a
 * restart must not lose is here: how many model calls the game has had, and what the model is
 * told, so every call for a game is given the same facts.
 */
type PendingPrediction = {
  gameId: string;
  startTime: string;
  homeTeamId: string;
  awayTeamId: string;
  /** Model calls made for this game so far: the index into `MODEL_OF_EACH_CALL` of the next. */
  calls: number;
  /** Failed tries at reading the game's pre-game facts from ESPN. */
  pregameFailures: number;
  /** After such a failure, the instant before which the game is left alone. */
  notBefore: number;
  /** Null until ESPN's summary has been read. */
  inputs: PredictionInputs | null;
};
/** How many model calls have been made on one slate's date. */
type ModelCalls = { date: string; count: number };
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
   * If ESPN fails, the answer is the games as last seen. `heardAt` is when ESPN last answered.
   */
  async getScoreboard(): Promise<ScoreboardReading> {
    await this.pollIfStale();
    return { ...this.state, heardAt: this.ctx.storage.kv.get<string>(HEARD_AT_KEY) ?? null };
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
    const heardAt = new Date().toISOString();
    this.ctx.storage.kv.put(HEARD_AT_KEY, heardAt);
    // State is sent whole to every open page, so it is set only when a poll finds a difference.
    // A poll that finds none sends only the time, which is what keeps "updated" moving.
    if (slate.date !== previous.date || JSON.stringify(games) !== JSON.stringify(previous.games)) {
      this.setState({ ...previous, date: slate.date, games, updatedAt: heardAt });
    } else {
      const heard: ScoreboardHeard = { type: "scoreboard_heard", at: heardAt };
      this.broadcast(JSON.stringify(heard));
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
    // Not with the day's model calls spent: the timer would find nothing it may do.
    const callsLeft = this.#modelCallsToday() < DAILY_MODEL_CALLS;
    if (callsLeft && this.#readyPredictions().length > 0) await this.#runAtOnce("makePredictions");
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
   * Called once for each game the first time it is seen on today's slate: notes that the game's
   * Prediction is to be made (spec section 6). It is awaited inside the poll, and so inside
   * first paint, so it only writes the note; `makePredictions` does the work from a timer. A game
   * first seen after its start gets no Prediction: a pick is made before the game or not at all.
   */
  protected async startPrediction(game: Game): Promise<void> {
    if (game.status !== "scheduled" || Date.parse(game.startTime) <= Date.now()) return;
    const key = PENDING_PREDICTION_PREFIX + game.id;
    // A game handed over twice keeps the calls it has already had.
    if (this.ctx.storage.kv.get<PendingPrediction>(key) !== undefined) return;
    const pending: PendingPrediction = {
      gameId: game.id,
      startTime: game.startTime,
      homeTeamId: game.home.id,
      awayTeamId: game.away.id,
      calls: 0,
      pregameFailures: 0,
      notBefore: 0,
      inputs: null,
    };
    this.ctx.storage.kv.put(key, pending);
  }

  /**
   * The one place a model is called: Workers AI through the Worker's binding, by way of AI
   * Gateway, which keeps the log of prompts and answers. A test replaces `env.AI`.
   */
  protected async runModel(model: string, request: PredictionRequest, gameId: string) {
    const gateway = { id: AI_GATEWAY_ID, skipCache: true, metadata: { gameId } };
    // The binding's types name each model's request apart; the prompt is one shape for both.
    const ai = this.env.AI as unknown as {
      run(model: string, request: PredictionRequest, options: object): Promise<unknown>;
    };
    return await ai.run(model, request, { gateway });
  }

  /**
   * A timer's callback, not for calling. Makes one step towards one game's Prediction, then sets
   * itself again while games are waiting, so the Scoreboard's own poll is never held up by more
   * than one model call. A step is at most one call: `gpt-oss-120b`, the same again if its answer
   * fails the schema, then the llama model once. The first answer that passes is stored as the
   * game's Prediction; after the third that does not, a failed row is, and the game is not tried
   * again. Nothing is computed in a Prediction's place.
   *
   * A game that has started is dropped with no row. With the day's model calls spent, the games
   * still waiting stay noted and nothing is called.
   */
  async makePredictions(): Promise<void> {
    const db = createDb(this.env.DB);
    const next = await this.#nextPendingPrediction(db);
    if (!next || this.#modelCallsToday() >= DAILY_MODEL_CALLS) return;
    if (await this.#stepPrediction(db, ...next)) this.#tellPages();
    // A game whose facts ESPN would not give is not among these: it waits for a later poll.
    if (this.#readyPredictions().length > 0) await this.schedule(0, "makePredictions");
  }

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

  /** Every game whose Prediction is not settled, with its key. */
  #pendingPredictions(): [string, PendingPrediction][] {
    return [...this.ctx.storage.kv.list<PendingPrediction>({ prefix: PENDING_PREDICTION_PREFIX })];
  }

  /** The games whose Prediction can be worked on now. */
  #readyPredictions(): [string, PendingPrediction][] {
    return this.#pendingPredictions().filter(([, pending]) => pending.notBefore <= Date.now());
  }

  /**
   * The first game that needs a Prediction and can be worked on. On the way it forgets every
   * game that no longer needs one: one that has started, and one that already has its row.
   */
  async #nextPendingPrediction(db: Db): Promise<[string, PendingPrediction] | null> {
    for (const [key, pending] of this.#readyPredictions()) {
      const started = this.#hasStarted(pending);
      if (!started && (await getPrediction(db, pending.gameId)) === null) return [key, pending];
      this.ctx.storage.kv.delete(key);
    }
    return null;
  }

  /**
   * Whether a game is past the point of a Prediction. The slate as last polled decides while
   * the game is on it, since a start time moves; the time noted when it was first seen decides
   * once it is not.
   */
  #hasStarted(pending: PendingPrediction): boolean {
    const game = this.state.games.find(({ id }) => id === pending.gameId);
    if (game && game.status !== "scheduled") return true;
    return Date.parse(game?.startTime ?? pending.startTime) <= Date.now();
  }

  /**
   * One step for one game: reads its pre-game facts if it has none yet, then makes its next
   * model call. Returns whether the game's row was written, a Prediction or a failed attempt.
   * Otherwise the game is left noted for its next step, or forgotten because it has started.
   */
  async #stepPrediction(db: Db, key: string, pending: PendingPrediction): Promise<boolean> {
    const { gameId } = pending;
    const settle = async (row: StoredPrediction) => {
      const written = await insertPredictionIfAbsent(db, row);
      this.ctx.storage.kv.delete(key);
      return written;
    };
    const failed = (model: string, inputs: PredictionInputs | null) =>
      settle({
        gameId,
        status: "failed",
        madeAt: new Date().toISOString(),
        model,
        inputs: inputs ?? {},
      });

    if (pending.inputs === null) {
      try {
        const summary = await getGameSummary(gameId);
        if (summary.header.status !== "scheduled") {
          this.ctx.storage.kv.delete(key);
          return false;
        }
        pending.inputs = predictionInputs(summary.header, summary.pregame);
      } catch (error) {
        pending.pregameFailures += 1;
        pending.notBefore = Date.now() + PREGAME_RETRY_SECONDS * 1000;
        console.error(`Scoreboard: game ${gameId}'s pre-game facts were not read`, error);
        if (pending.pregameFailures >= PREGAME_ATTEMPTS) {
          return await failed(MODEL_OF_EACH_CALL[0], null);
        }
      }
      this.ctx.storage.kv.put(key, pending);
      if (pending.inputs === null) return false;
    }

    const { inputs } = pending;
    const model = MODEL_OF_EACH_CALL[pending.calls];
    // Every call was made and the row was not written: a restart during the last call, or D1
    // failing. The game has had its calls, so it is marked failed and no model is asked again.
    if (model === undefined) return await failed(FALLBACK_MODEL, inputs);
    // Counted before the call is made, so a call cut short by a restart is still counted.
    pending.calls += 1;
    this.ctx.storage.kv.put(key, pending);
    this.#countModelCall();
    const teams = teamsOf(inputs);
    let answer: ReturnType<typeof readModelAnswer> = null;
    try {
      const raw = await withTimeout(this.runModel(model, predictionRequest(inputs), gameId));
      answer = readModelAnswer(raw, teams);
      if (!answer) console.error(`Scoreboard: ${model} gave game ${gameId} no valid Prediction`);
    } catch (error) {
      console.error(`Scoreboard: ${model} failed for game ${gameId}`, error);
    }
    if (answer && this.#hasStarted(pending)) {
      // The puck dropped while the model was answering: a pick now would not be a Prediction.
      this.ctx.storage.kv.delete(key);
      return false;
    }
    if (answer) {
      return await settle({
        gameId,
        status: "made",
        pickTeamId: answer.pick === teams[0] ? pending.homeTeamId : pending.awayTeamId,
        winProbability: answer.winProbability,
        reasoning: answer.reasoning,
        keyFactors: answer.keyFactors,
        madeAt: new Date().toISOString(),
        model,
        inputs,
      });
    }
    if (pending.calls < MODEL_OF_EACH_CALL.length) return false;
    return await failed(model, inputs);
  }

  /** Model calls made so far on the current slate's date. */
  #modelCallsToday(): number {
    const calls = this.ctx.storage.kv.get<ModelCalls>(MODEL_CALLS_KEY);
    return calls?.date === this.#modelCallsDate() ? calls.count : 0;
  }

  /** Adds one to the count of the day's model calls. */
  #countModelCall(): void {
    const calls: ModelCalls = { date: this.#modelCallsDate(), count: this.#modelCallsToday() + 1 };
    this.ctx.storage.kv.put(MODEL_CALLS_KEY, calls);
  }

  /** The day the cap counts by: the slate's, which is the NHL's day and not UTC's. */
  #modelCallsDate(): string {
    return this.state.date ?? new Date().toISOString().slice(0, 10);
  }

  /** The dates the next catch-up fetches. None when there is nothing to catch up on. */
  #catchUpDates(): string[] {
    const from = this.ctx.storage.kv.get<string>(CATCH_UP_FROM_KEY);
    const today = this.state.date;
    if (from === undefined || today === null) return [];
    return missedDates(from, today, CATCH_UP_DATES_PER_RUN);
  }

  /** Sets a one-off timer for now, unless one for the same callback is already waiting. */
  async #runAtOnce(callback: "recordFinals" | "catchUp" | "makePredictions"): Promise<void> {
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

/** A model call's answer, or a rejection when it takes longer than a call may. */
async function withTimeout<T>(call: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("The model call timed out")), MODEL_CALL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
