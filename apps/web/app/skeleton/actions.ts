"use server";

import { exports } from "cloudflare:workers";
import { getAgentByName } from "agents";
import { refresh } from "next/cache";
import { SKELETON_AGENT_NAME } from "../../lib/skeleton";

export async function bumpSkeleton(): Promise<void> {
  const agent = await getAgentByName(exports.SkeletonAgent, SKELETON_AGENT_NAME);
  await agent.bump();
  // The Agent invalidated the tag outside this request, so the router is told to re-render.
  refresh();
}
