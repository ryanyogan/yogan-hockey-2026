"use server";

import { exports } from "cloudflare:workers";
import { getAgentByName } from "agents";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { seedSamplePicks } from "../../lib/sample-picks";
import { SKELETON_AGENT_NAME } from "../../lib/skeleton";

export async function bumpSkeleton(): Promise<void> {
  const agent = await getAgentByName(exports.SkeletonAgent, SKELETON_AGENT_NAME);
  await agent.bump();
  // The Agent invalidated the tag outside this request, so the router is told to re-render.
  refresh();
}

/** Writes the sample picks of `/skeleton/picks` to D1. Fixture mode only. */
export async function seedPicks(form: FormData): Promise<void> {
  if (process.env.ESPN_FIXTURES !== "1") throw new Error("Sample picks are for fixture mode");
  const finalPick = form.get("final") === "wrong" ? "wrong" : "right";
  await seedSamplePicks(finalPick);
  redirect(`/skeleton/picks?seeded=${finalPick}`);
}
