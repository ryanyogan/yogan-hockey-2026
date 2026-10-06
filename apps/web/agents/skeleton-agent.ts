import { createDb, recordSkeletonBump } from "@yogan-hockey/db";
import type { Pulse } from "@yogan-hockey/schemas";
import { Agent } from "agents";
import { revalidateTag } from "next/cache";
import { SKELETON_TAG } from "../lib/skeleton";

/**
 * Walking-skeleton Agent (#31). It proves the joins the Scoreboard and Game
 * Agents rest on: state pushed to viewers, first paint over RPC, a write to
 * D1, and a cache tag invalidated from inside the Agent.
 */
export class SkeletonAgent extends Agent<Env, Pulse> {
  initialState: Pulse = { count: 0, lastBumpAt: null };

  /** Browsers only ever read an Agent's state. */
  shouldConnectionBeReadonly(): boolean {
    return true;
  }

  /** First paint, called by a server component over Durable Object RPC. */
  getPulse(): Pulse {
    return this.state;
  }

  async bump(): Promise<Pulse> {
    const pulse: Pulse = { count: this.state.count + 1, lastBumpAt: new Date().toISOString() };
    await recordSkeletonBump(createDb(this.env.DB), {
      count: pulse.count,
      bumpedAt: pulse.lastBumpAt ?? "",
    });
    this.setState(pulse);
    await revalidateTag(SKELETON_TAG, { expire: 0 });
    return pulse;
  }
}
