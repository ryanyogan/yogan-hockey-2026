import { EspnParseError } from "@yogan-hockey/espn";

/** Failed polls in a row before the alert. A response that does not parse alerts on the first. */
export const FAILED_POLLS_BEFORE_ALERT = 3;

const STORAGE_KEY = "espn-alert";

/** What an Agent remembers about its ESPN trouble, in its own storage. */
type StoredAlert = {
  /** Failed polls in a row. */
  failures: number;
  /** True from the announcement that a problem started until the one that it cleared. */
  alerting: boolean;
};

const QUIET: StoredAlert = { failures: 0, alerting: false };

/** What is announced: an Agent's problem with ESPN started, or it cleared. */
export type EspnAlertEvent =
  | { kind: "started"; source: string; reason: string }
  | { kind: "cleared"; source: string };

/**
 * The one place an alert is announced, once when a problem starts and once when it clears. Today
 * that is a line in the Worker's logs: an error for the start, which Workers observability also
 * groups into an Issue, and a plain line for the all-clear. Nothing is pushed anywhere.
 *
 * A push channel, when the site has one, is sent from here and nowhere else. It may throw:
 * `EspnAlert` logs an announcement that fails and carries on, so it never fails a poll.
 */
export async function announce(event: EspnAlertEvent): Promise<void> {
  if (event.kind === "started") {
    console.error(`${event.source}: ESPN problem started: ${event.reason}`);
  } else {
    console.log(`${event.source}: ESPN problem cleared`);
  }
}

/**
 * An Agent's ESPN alert (spec section 4): announced once when a problem starts, which is three
 * failed polls in a row or one response that does not parse, and once more when it clears.
 *
 * Each Agent that polls makes one of these over its own storage and reports every poll to it:
 * `succeeded()` or `failed(error)`. Whether a problem is open is kept in that storage, so a
 * restarted Agent neither announces it again nor forgets the all-clear.
 */
export class EspnAlert {
  readonly #storage: DurableObjectStorage;
  readonly #source: string;

  /**
   * @param storage The Agent's own storage (`this.ctx.storage`).
   * @param source Names the Agent in the alert, such as "Scoreboard" or "Game 401891815".
   */
  constructor(storage: DurableObjectStorage, source: string) {
    this.#storage = storage;
    this.#source = source;
  }

  /** Failed polls in a row so far. */
  get failures(): number {
    return this.#read().failures;
  }

  /** A poll failed. Announces the problem if this is where it starts. */
  async failed(error: unknown): Promise<void> {
    const before = this.#read();
    const failures = before.failures + 1;
    const starts =
      !before.alerting &&
      (error instanceof EspnParseError || failures >= FAILED_POLLS_BEFORE_ALERT);
    // Stored before the announcement is awaited, so a poll that fails meanwhile cannot make a second.
    this.#storage.kv.put(STORAGE_KEY, { failures, alerting: before.alerting || starts });
    if (!starts) return;
    const reason = error instanceof Error ? error.message : String(error);
    await this.#announce({ kind: "started", source: this.#source, reason });
  }

  /** A poll worked. Announces the all-clear if a problem was open. */
  async succeeded(): Promise<void> {
    const before = this.#read();
    if (before.failures === 0 && !before.alerting) return;
    this.#storage.kv.put(STORAGE_KEY, QUIET);
    if (!before.alerting) return;
    await this.#announce({ kind: "cleared", source: this.#source });
  }

  /** An alert that cannot be announced is logged and dropped: it must never fail a poll. */
  async #announce(event: EspnAlertEvent): Promise<void> {
    try {
      await announce(event);
    } catch (error) {
      console.error(`${this.#source}: an alert could not be announced`, error);
    }
  }

  #read(): StoredAlert {
    return this.#storage.kv.get<StoredAlert>(STORAGE_KEY) ?? QUIET;
  }
}
