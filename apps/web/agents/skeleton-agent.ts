import { createDb, recordSkeletonBump } from "@yogan-hockey/db";
import type { Pulse } from "@yogan-hockey/schemas";
import { Agent } from "agents";
import { invalidateTag } from "../lib/invalidate-tag";
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
    const bumpedAt = new Date().toISOString();
    // State moves on before the first await, so two bumps at once cannot take the same count.
    const pulse: Pulse = { count: this.state.count + 1, lastBumpAt: bumpedAt };
    this.setState(pulse);
    await recordSkeletonBump(createDb(this.env.DB), { count: pulse.count, bumpedAt });
    await invalidateTag(SKELETON_TAG);
    return pulse;
  }
}
