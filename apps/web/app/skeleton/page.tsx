import { env, exports } from "cloudflare:workers";
import { createDb, latestSkeletonBumps } from "@yogan-hockey/db";
import { PulseSchema } from "@yogan-hockey/schemas";
import { Button } from "@yogan-hockey/ui/components/button";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { getAgentByName } from "agents";
import type { Metadata } from "next";
import { cachedSkeletonReading, SKELETON_AGENT_NAME } from "../../lib/skeleton";
import { bumpSkeleton } from "./actions";
import { PulseLive } from "./pulse-live";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Walking skeleton" };

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
    <>
      <Section data-testid="join-ui">
        <SectionHeader title="1. Shared UI package" count="packages/ui" />
        <p className="mb-2 text-muted-foreground">
          The ledgers and the button come from packages/ui, styled by its Tailwind theme.
        </p>
        <form action={bumpSkeleton}>
          <Button type="submit">Bump the Agent</Button>
        </form>
      </Section>

      <Section data-testid="join-cache">
        <SectionHeader title="2. Data cache on KV" count='60 seconds, tag "skeleton"' />
        <p className="mb-2 text-muted-foreground">
          A reload shows the same reading until the Agent invalidates the tag.
        </p>
        <Ledger>
          <LedgerHead>
            <LedgerColumn>serial</LedgerColumn>
            <LedgerColumn>taken</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            <LedgerRow>
              <LedgerCell data-testid="reading-serial">{reading.serial}</LedgerCell>
              <LedgerCell tone="note">{reading.takenAt}</LedgerCell>
            </LedgerRow>
          </LedgerBody>
        </Ledger>
      </Section>

      <Section data-testid="join-db">
        <SectionHeader title="3. Drizzle on D1" count="the latest rows the Agent wrote" />
        {bumps.length === 0 ? (
          <p data-testid="bump-rows-empty">No rows yet. Bump the Agent.</p>
        ) : (
          <Ledger>
            <LedgerHead>
              <LedgerColumn>row</LedgerColumn>
            </LedgerHead>
            <LedgerBody data-testid="bump-rows">
              {bumps.map((bump) => (
                <LedgerRow key={bump.id}>
                  <LedgerCell>
                    bump {bump.count} at {bump.bumpedAt}
                  </LedgerCell>
                </LedgerRow>
              ))}
            </LedgerBody>
          </Ledger>
        )}
      </Section>

      <Section data-testid="join-agent">
        <SectionHeader title="4. Agent" count="first paint over RPC, then pushes over the socket" />
        <PulseLive name={SKELETON_AGENT_NAME} initial={pulse} />
      </Section>
    </>
  );
}
