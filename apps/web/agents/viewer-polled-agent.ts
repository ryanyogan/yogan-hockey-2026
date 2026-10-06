import { Agent, type Connection, type Schedule } from "agents";
import { EspnAlert } from "./espn-alert";

const POLLED_AT_KEY = "polled-at";

/**
 * An Agent that polls ESPN only while someone is watching (spec section 4). A viewer is an open
 * socket: polling starts on the first connection and stops when the last one leaves.
 *
 * A subclass says how to poll once (`poll`) and how long to wait before the next one
 * (`pollIntervalSeconds`); this class owns the timer, the staleness check for first paint, the
 * alert, and the rule that a browser never writes state.
 *
 * The timer is a one-off schedule that each poll sets again while a viewer is connected. It is
 * never an interval, so the cadence can change from one poll to the next, and a poll that finds
 * nobody watching is the last. The schedule is in the Agent's storage: after a deploy restarts
 * the Agent it fires as before.
 */
export abstract class ViewerPolledAgent<State> extends Agent<Env, State> {
  #polling: Promise<void> | null = null;
  #alert: EspnAlert | null = null;

  /** Names this Agent in an alert, such as "Scoreboard". */
  protected abstract get alertSource(): string;

  /** One poll: fetch from ESPN and take in the answer. Throws when the poll fails. */
  protected abstract poll(): Promise<void>;

  /** Seconds from one poll to the next, as things stand. Null when there is nothing left to poll for. */
  protected abstract pollIntervalSeconds(): number | null;

  /** Browsers only ever read an Agent's state. */
  override shouldConnectionBeReadonly(): boolean {
    return true;
  }

  override async onConnect(): Promise<void> {
    if ((await this.#pendingTicks()).length > 0) return;
    await this.#scheduleTick(this.#secondsUntilDue());
  }

  override async onClose(connection: Connection): Promise<void> {
    // The connection that is closing may still be listed.
    const others = [...this.getConnections()].filter((other) => other.id !== connection.id);
    if (others.length === 0) await this.#cancelTicks(await this.#pendingTicks());
  }

  /** The schedule's callback. Not for calling: use `pollNow`. */
  async pollTick(_payload?: unknown, running?: Schedule<unknown>): Promise<void> {
    await this.pollNow();
    const others = (await this.#pendingTicks()).filter((tick) => tick.id !== running?.id);
    await this.#cancelTicks(others);
    // With nobody watching the loop ends here.
    if ([...this.getConnections()].length > 0) await this.#scheduleTick(this.pollIntervalSeconds());
  }

  /**
   * Polls once and reports the outcome to the alert. It never throws: after a failed poll the
   * stored state is simply what it was. Calls that overlap share one poll.
   */
  protected pollNow(): Promise<void> {
    this.#polling ??= this.#pollOnce().finally(() => {
      this.#polling = null;
    });
    return this.#polling;
  }

  /**
   * For first paint: polls first when the last poll is older than one polling interval, which it
   * is whenever nobody has been watching.
   */
  protected async pollIfStale(): Promise<void> {
    const interval = this.pollIntervalSeconds();
    if (interval !== null && this.#secondsSincePoll() > interval) await this.pollNow();
  }

  async #pollOnce(): Promise<void> {
    try {
      this.ctx.storage.kv.put(POLLED_AT_KEY, Date.now());
      try {
        await this.poll();
      } catch (error) {
        console.error(`${this.alertSource}: poll failed`, error);
        await this.#espnAlert.failed(error);
        return;
      }
      await this.#espnAlert.succeeded();
    } catch (error) {
      // Nothing here may reach the timer: a tick that throws is retried and then dropped.
      console.error(`${this.alertSource}: could not record a poll`, error);
    }
  }

  /** Seconds since the last poll, good or bad. Infinity when there has been none. */
  #secondsSincePoll(): number {
    const polledAt = this.ctx.storage.kv.get<number>(POLLED_AT_KEY);
    return polledAt === undefined ? Number.POSITIVE_INFINITY : (Date.now() - polledAt) / 1000;
  }

  /** Seconds until the next poll is due for a viewer arriving now: 0 when it already is. */
  #secondsUntilDue(): number | null {
    const interval = this.pollIntervalSeconds();
    if (interval === null) return null;
    return Math.max(0, Math.ceil(interval - this.#secondsSincePoll()));
  }

  get #espnAlert(): EspnAlert {
    this.#alert ??= new EspnAlert(this.ctx.storage, this.env.NTFY_TOPIC, this.alertSource);
    return this.#alert;
  }

  async #pendingTicks(): Promise<Schedule<unknown>[]> {
    const schedules = await this.listSchedules();
    return schedules.filter((schedule) => schedule.callback === "pollTick");
  }

  async #scheduleTick(seconds: number | null): Promise<void> {
    if (seconds !== null) await this.schedule(seconds, "pollTick");
  }

  async #cancelTicks(ticks: Schedule<unknown>[]): Promise<void> {
    for (const tick of ticks) await this.cancelSchedule(tick.id);
  }
}
