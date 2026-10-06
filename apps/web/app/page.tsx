import { env, exports } from "cloudflare:workers";
import { createDb, latestSkeletonBumps } from "@yogan-hockey/db";
import { PulseSchema } from "@yogan-hockey/schemas";
import { Button } from "@yogan-hockey/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@yogan-hockey/ui/components/card";
import { getAgentByName } from "agents";
import { cachedSkeletonReading, SKELETON_AGENT_NAME } from "../lib/skeleton";
import { bumpSkeleton } from "./actions";
import { PulseLive } from "./pulse-live";

export const dynamic = "force-dynamic";

/** Walking skeleton (#31): one page exercising each join the design rests on. */
export default async function SkeletonPage() {
  const agent = await getAgentByName(exports.SkeletonAgent, SKELETON_AGENT_NAME);
  const [reading, bumps, rpcPulse] = await Promise.all([
    cachedSkeletonReading(),
    latestSkeletonBumps(createDb(env.DB), 5),
    agent.getPulse(),
  ]);
  // An RPC result is not a plain object; parsing copies it into one for the client component.
  const pulse = PulseSchema.parse(rpcPulse);

  return (
    <main className="mx-auto grid max-w-2xl gap-4 p-6">
      <h1 className="font-semibold text-2xl">Walking skeleton</h1>

      <Card data-testid="join-ui">
        <CardHeader>
          <CardTitle>1. Shared UI package</CardTitle>
          <CardDescription>
            These cards and the button come from packages/ui, styled by its Tailwind theme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={bumpSkeleton}>
            <Button type="submit">Bump the Agent</Button>
          </form>
        </CardContent>
      </Card>

      <Card data-testid="join-cache">
        <CardHeader>
          <CardTitle>2. Data cache on KV</CardTitle>
          <CardDescription>
            Cached for 60 seconds under the tag "skeleton". A reload shows the same reading until
            the Agent invalidates the tag.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p data-testid="reading-serial">{reading.serial}</p>
          <p className="text-muted-foreground" data-testid="reading-taken-at">
            taken {reading.takenAt}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="join-db">
        <CardHeader>
          <CardTitle>3. Drizzle on D1</CardTitle>
          <CardDescription>
            The latest rows the Agent wrote, read by this server component.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {bumps.length === 0 ? (
            <p data-testid="bump-rows-empty">No rows yet. Bump the Agent.</p>
          ) : (
            <ol data-testid="bump-rows">
              {bumps.map((bump) => (
                <li key={bump.id}>
                  bump {bump.count} at {bump.bumpedAt}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card data-testid="join-agent">
        <CardHeader>
          <CardTitle>4. Agent</CardTitle>
          <CardDescription>
            First paint over RPC, then pushes over the socket. Each bump also invalidates the tag
            above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PulseLive name={SKELETON_AGENT_NAME} initial={pulse} />
        </CardContent>
      </Card>
    </main>
  );
}
