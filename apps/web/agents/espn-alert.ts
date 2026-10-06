import { EspnParseError } from "@yogan-hockey/espn";

/** Failed polls in a row before the push. A response that does not parse alerts on the first. */
export const FAILED_POLLS_BEFORE_ALERT = 3;

const STORAGE_KEY = "espn-alert";
const NTFY = "https://ntfy.sh";

/** What an Agent remembers about its ESPN trouble, in its own storage. */
type StoredAlert = {
  /** Failed polls in a row. */
  failures: number;
  /** True from the push that says a problem started until the push that says it cleared. */
  alerting: boolean;
};

const QUIET: StoredAlert = { failures: 0, alerting: false };

/**
 * An Agent's ESPN alert (spec section 4): one ntfy push when a problem starts, which is three
 * failed polls in a row or one response that does not parse, and one more when it clears.
 *
 * Each Agent that polls makes one of these over its own storage and reports every poll to it:
 * `succeeded()` or `failed(error)`. Whether a problem is open is kept in that storage, so a
 * restarted Agent neither repeats the push nor forgets to send the all-clear.
 */
export class EspnAlert {
  readonly #storage: DurableObjectStorage;
  readonly #topic: string | undefined;
  readonly #source: string;

  /**
   * @param storage The Agent's own storage (`this.ctx.storage`).
   * @param topic The ntfy topic, a Worker secret. With none the state is kept and nothing is sent.
   * @param source Names the Agent in the push, such as "Scoreboard" or "Game 401891815".
   */
  constructor(storage: DurableObjectStorage, topic: string | undefined, source: string) {
    this.#storage = storage;
    this.#topic = topic;
    this.#source = source;
  }

  /** Failed polls in a row so far. */
  get failures(): number {
    return this.#read().failures;
  }

  /** A poll failed. Sends the push if this is where the problem starts. */
  async failed(error: unknown): Promise<void> {
    const before = this.#read();
    const failures = before.failures + 1;
    const starts =
      !before.alerting &&
      (error instanceof EspnParseError || failures >= FAILED_POLLS_BEFORE_ALERT);
    // Stored before the push is awaited, so a poll that fails meanwhile cannot send a second one.
    this.#storage.kv.put(STORAGE_KEY, { failures, alerting: before.alerting || starts });
    if (!starts) return;
    const reason = error instanceof Error ? error.message : String(error);
    await this.#push(`${this.#source}: ESPN problem`, reason, "warning");
  }

  /** A poll worked. Sends the all-clear if a problem was open. */
  async succeeded(): Promise<void> {
    const before = this.#read();
    if (before.failures === 0 && !before.alerting) return;
    this.#storage.kv.put(STORAGE_KEY, QUIET);
    if (!before.alerting) return;
    await this.#push(`${this.#source}: ESPN recovered`, "Polls are working again.", "ok");
  }

  #read(): StoredAlert {
    return this.#storage.kv.get<StoredAlert>(STORAGE_KEY) ?? QUIET;
  }

  /** An alert that cannot be delivered is logged and dropped: it must never fail a poll. */
  async #push(title: string, message: string, tag: "warning" | "ok"): Promise<void> {
    if (!this.#topic) return;
    try {
      const response = await fetch(`${NTFY}/${this.#topic}`, {
        method: "POST",
        headers: { Title: title, Tags: tag === "ok" ? "white_check_mark" : "warning" },
        body: message,
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) console.error(`ntfy answered ${response.status} to "${title}"`);
    } catch (error) {
      console.error(`ntfy push "${title}" failed`, error);
    }
  }
}
