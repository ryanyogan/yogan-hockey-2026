import { createDb, getGameWithPlays, replaceGamePlays } from "@yogan-hockey/db";
import { EspnFetchError, getGameSummary } from "@yogan-hockey/espn";
import {
  diffPlays,
  type GameHeader,
  type GameSnapshot,
  type GameStreamMessage,
  type GameStreamState,
  type GameSummary,
  type Play,
} from "@yogan-hockey/schemas";
import type { Connection } from "agents";
import { FAILED_POLLS_BEFORE_ALERT } from "./espn-alert";
import { rereadArchivedPlays, saveFinal } from "./final-game";
import { ViewerPolledAgent } from "./viewer-polled-agent";

/** While play is in progress, and until the first poll says where the game stands. */
export const PLAY_POLL_SECONDS = 10;
/** In an intermission, and in the 15 minutes before a scheduled start. */
export const INTERMISSION_POLL_SECONDS = 30;
/** A game still to start, or postponed: someone has its Agent open, and little can change. */
export const IDLE_POLL_SECONDS = 5 * 60;
/** How long before a scheduled start the 30-second cadence begins. */
const PREGAME_MS = 15 * 60 * 1000;

/** A poll that finds more differences than this sends every play once, not a message for each. */
const MOST_MESSAGES_PER_POLL = 25;
/** How long after the archive the game's plays are read from ESPN again. */
const PLAYS_REREAD_SECONDS = 24 * 60 * 60;
/** How many times the write to D1 is tried before the Replay's first open is left to do it. */
const ARCHIVE_ATTEMPTS = 5;
/** How long a failed write to D1 waits before the next try. */
const ARCHIVE_RETRY_SECONDS = 30;
/** How long ESPN's "no such game" is believed before it is asked again. */
const NOT_FOUND_MS = 10 * 60 * 1000;

/** Storage key of how many times the write to D1 has failed. */
const ARCHIVE_FAILURES_KEY = "archive-failures";
/** Storage key of when ESPN last said it has no such game, in milliseconds. */
const NOT_FOUND_AT_KEY = "not-found-at";

type StoredPlay = { body: string };

/**
 * Seconds from one poll of a game to the next (spec section 4): 10 while play is in progress, 30
 * in an intermission, and never again once the game is final. A game still to start is polled as
 * the Scoreboard polls: every 5 minutes, and every 30 seconds from 15 minutes before its start.
 *
 * An intermission is a live game whose last play is the end of a period. The header's clock is
 * not asked: the summaries recorded so far carry none (build notes, "ESPN").
 */
export function gamePollSeconds(
  header: GameHeader | null,
  lastPlay: Play | undefined,
  now: number,
): number | null {
  if (header === null) return PLAY_POLL_SECONDS;
  switch (header.status) {
    case "final":
      return null;
    case "live":
      return lastPlay?.type === "period-end" ? INTERMISSION_POLL_SECONDS : PLAY_POLL_SECONDS;
    case "postponed":
      return IDLE_POLL_SECONDS;
    case "scheduled": {
      const untilPregame = Math.ceil((Date.parse(header.startTime) - PREGAME_MS - now) / 1000);
      return Math.min(IDLE_POLL_SECONDS, Math.max(INTERMISSION_POLL_SECONDS, untilPregame));
    }
  }
}

/**
 * The Game Agent (spec section 4): one NHL game, named by ESPN's event id, pushed to the game
 * pages that have it open. It polls ESPN only while one does.
 *
 * Its synced state is the header alone. The plays are kept in its own SQLite storage while the
 * game is live and sent as `GameStreamMessage`s: every play so far when a viewer connects, then
 * what each poll found new, changed or removed. Every poll reads the whole game and compares it
 * with what is stored, so a poll after any gap (a deploy, an evening with nobody watching)
 * catches up on everything at once.
 *
 * At the final the game's row and plays go to D1, which is the permanent record: the plays leave
 * this Agent's storage, `archived` turns true, and nothing polls again.
 */
export class GameAgent extends ViewerPolledAgent<GameStreamState> {
  initialState: GameStreamState = { header: null, delayed: false, archived: false };

  /** The stored plays, read once: storage is written first and this follows it. */
  #plays: Play[] | null = null;
  #archiving: Promise<void> | null = null;

  /**
   * First paint, called by a server component over Durable Object RPC: the header and every play
   * so far. With nobody watching what is stored is old, so ESPN is asked first when the last poll
   * is older than one polling interval. A finished game is answered from what is kept.
   */
  async getGame(): Promise<GameSnapshot> {
    await this.pollIfStale();
    return { ...this.state, plays: await this.#playsSoFar(), notFound: this.#notFound() };
  }

  /**
   * For the Replay's first open of a game nobody watched: reads the finished game from ESPN once,
   * writes its row and plays to D1 and sets the 24-hour re-read. True when the game is in D1 as
   * this returns; false when it is not finished or the write failed, and a later call tries again.
   */
  async ensureArchived(): Promise<boolean> {
    if (this.state.archived) return true;
    if (this.state.header?.status !== "final") await this.pollNow();
    try {
      await this.#archive();
    } catch (error) {
      console.error(`${this.alertSource}: the game was not written to D1`, error);
    }
    return this.state.archived;
  }

  override async onConnect(connection: Connection): Promise<void> {
    const everyPlay: GameStreamMessage = { type: "plays", plays: await this.#playsSoFar() };
    connection.send(JSON.stringify(everyPlay));
    await super.onConnect(connection);
  }

  /**
   * A timer's callback, not for calling. Writes the finished game to D1. A write that fails is
   * tried again every 30 seconds, `ARCHIVE_ATTEMPTS` times in all; after that the plays stay in
   * this Agent's storage until the Replay's first open calls `ensureArchived`.
   */
  async archive(): Promise<void> {
    try {
      await this.#archive();
      this.ctx.storage.kv.delete(ARCHIVE_FAILURES_KEY);
    } catch (error) {
      const failures = (this.ctx.storage.kv.get<number>(ARCHIVE_FAILURES_KEY) ?? 0) + 1;
      if (failures < ARCHIVE_ATTEMPTS) {
        this.ctx.storage.kv.put(ARCHIVE_FAILURES_KEY, failures);
        // Not idempotent: that would find the timer running now, which is deleted when it ends.
        await this.schedule(ARCHIVE_RETRY_SECONDS, "archive");
        console.error(`${this.alertSource}: the game is not yet written to D1`, error);
      } else {
        this.ctx.storage.kv.delete(ARCHIVE_FAILURES_KEY);
        console.error(`${this.alertSource}: writing the game to D1 was given up on`, error);
      }
    }
  }

  /**
   * A timer's callback, not for calling. A day after the archive, reads the game's plays from
   * ESPN into D1 again: ESPN corrects plays for a day or so after the horn.
   */
  async rereadPlays(): Promise<void> {
    await rereadArchivedPlays(createDb(this.env.DB), this.name);
  }

  protected override get alertSource(): string {
    return `Game ${this.name}`;
  }

  protected override pollIntervalSeconds(): number | null {
    if (this.#notFound()) return null;
    // An archived game's plays are in D1; it is final, which is all that is asked here.
    const lastPlay = this.state.archived ? undefined : this.#livePlays().at(-1);
    return gamePollSeconds(this.state.header, lastPlay, Date.now());
  }

  /**
   * The game as ESPN has it now. It is a method of its own so that the header can come from
   * somewhere else: if a live summary turns out to carry no clock, the Scoreboard's `Game` has
   * one (#54 checks on a live game).
   */
  protected readSummary(): Promise<GameSummary> {
    return getGameSummary(this.name);
  }

  protected override async poll(): Promise<void> {
    if (this.state.archived) return;
    let summary: GameSummary;
    try {
      summary = await this.readSummary();
    } catch (error) {
      // An id ESPN has never heard of is not an ESPN problem, and not worth asking about again
      // every 10 seconds. A game already seen that goes missing is a failed poll like any other.
      const unknownGame = error instanceof EspnFetchError && error.notFound;
      if (!unknownGame || this.state.header !== null) throw error;
      this.ctx.storage.kv.put(NOT_FOUND_AT_KEY, Date.now());
      return;
    }
    this.ctx.storage.kv.delete(NOT_FOUND_AT_KEY);
    this.#takePlays(summary.plays);
    // State is sent whole to every viewer, so it is set only when a poll finds a difference.
    if (JSON.stringify(summary.header) !== JSON.stringify(this.state.header)) {
      this.setState({ ...this.state, header: summary.header });
    }
    // The poll that finds the game final is the last: the interval is null from here on. The
    // write to D1 is a timer's work, so neither first paint nor the viewers wait on it.
    if (summary.header.status === "final") {
      await this.schedule(0, "archive", undefined, { idempotent: true });
    }
  }

  /** The stall (spec section 4): set after three failed polls in a row, cleared by a good one. */
  protected override async afterPoll(): Promise<void> {
    const delayed = this.failedPolls >= FAILED_POLLS_BEFORE_ALERT;
    if (delayed !== this.state.delayed) this.setState({ ...this.state, delayed });
  }

  /** Whether ESPN said, a short while ago, that it has no game of this id. */
  #notFound(): boolean {
    const at = this.ctx.storage.kv.get<number>(NOT_FOUND_AT_KEY);
    return at !== undefined && Date.now() - at < NOT_FOUND_MS;
  }

  /** Every play so far, in order: from this Agent's storage, or from D1 once archived. */
  async #playsSoFar(): Promise<Play[]> {
    if (!this.state.archived) return this.#livePlays();
    const archived = await getGameWithPlays(createDb(this.env.DB), this.name);
    return archived?.plays ?? [];
  }

  /** The plays in this Agent's storage, in ESPN's order. */
  #livePlays(): Play[] {
    if (this.#plays === null) {
      const { sql } = this.ctx.storage;
      sql.exec(
        "CREATE TABLE IF NOT EXISTS game_plays (id TEXT PRIMARY KEY, position INTEGER NOT NULL, body TEXT NOT NULL)",
      );
      const rows = sql.exec<StoredPlay>("SELECT body FROM game_plays ORDER BY position").toArray();
      this.#plays = rows.map((row) => JSON.parse(row.body) as Play);
    }
    return this.#plays;
  }

  /**
   * Takes in ESPN's list of plays from one poll: stores what differs from the stored plays and
   * tells the viewers. Nothing is awaited between the writes, so storage holds one poll's plays
   * or the next's and never a mixture.
   */
  #takePlays(plays: Play[]): void {
    const before = this.#livePlays();
    const messages = diffPlays(before, plays);
    if (messages.length === 0) return;

    const stored = new Map(
      before.map((play, position) => [play.id, { position, body: JSON.stringify(play) }]),
    );
    const { sql } = this.ctx.storage;
    this.ctx.storage.transactionSync(() => {
      for (const message of messages) {
        if (message.type !== "play-removed") continue;
        sql.exec("DELETE FROM game_plays WHERE id = ?", message.id);
      }
      plays.forEach((play, position) => {
        const was = stored.get(play.id);
        const body = JSON.stringify(play);
        if (was?.position === position && was.body === body) return;
        sql.exec(
          "INSERT INTO game_plays (id, position, body) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET position = excluded.position, body = excluded.body",
          play.id,
          position,
          body,
        );
      });
    });
    this.#plays = plays;

    const sent: GameStreamMessage[] =
      messages.length > MOST_MESSAGES_PER_POLL ? [{ type: "plays", plays }] : messages;
    for (const message of sent) this.broadcast(JSON.stringify(message));
  }

  /** Writes the finished game to D1 once, however many callers ask at the same moment. */
  #archive(): Promise<void> {
    this.#archiving ??= this.#writeToD1().finally(() => {
      this.#archiving = null;
    });
    return this.#archiving;
  }

  /**
   * The final (spec section 4): the game's row, then every play, then the 24-hour re-read. Each
   * step is safe to repeat. Only when all of it is done do the plays leave this Agent's storage
   * and the viewers hear that the game is archived.
   */
  async #writeToD1(): Promise<void> {
    const { header, archived } = this.state;
    if (archived || header?.status !== "final") return;
    const db = createDb(this.env.DB);
    await saveFinal(db, header);
    await replaceGamePlays(db, header.id, this.#livePlays());
    await this.schedule(PLAYS_REREAD_SECONDS, "rereadPlays", undefined, { idempotent: true });
    this.ctx.storage.sql.exec("DELETE FROM game_plays");
    this.#plays = [];
    this.setState({ ...this.state, archived: true });
  }
}
