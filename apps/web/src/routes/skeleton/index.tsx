import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@yogan-hockey/ui/components/badge";
import { Button } from "@yogan-hockey/ui/components/button";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { FavoriteMarker, LiveMarker } from "@yogan-hockey/ui/components/marker";
import { PageHeader, Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { FormEvent } from "react";
import { PulseLive } from "../../../components/skeleton/pulse-live";
import { bumpSkeleton, readSkeleton } from "../../functions/skeleton";
import { titled } from "../../head";

/** Walking skeleton (#31): one page exercising each join the design rests on. */
export const Route = createFileRoute("/skeleton/")({
  loader: () => readSkeleton(),
  head: ({ match }) => titled(match, "Walking skeleton"),
  component: SkeletonPage,
});

function SkeletonPage() {
  const { reading, bumps, pulse, agentName } = Route.useLoaderData();
  const router = useRouter();
  const bump = useServerFn(bumpSkeleton);

  async function bumpAndReadAgain(event: FormEvent) {
    event.preventDefault();
    await bump();
    // The Agent forgot the cached reading and wrote a row: the loader reads both again.
    await router.invalidate();
  }

  return (
    <>
      <PageHeader title="Walking skeleton" count="one page, each join" />

      <Section data-testid="join-ui">
        <SectionHeader title="1. Shared UI package" count="packages/ui" />
        <p className="my-2 text-muted-foreground">
          The title, the labels, the ledgers, the marks and the button come from packages/ui, styled
          by its Tailwind theme.
        </p>
        {/* Every mark the package draws, side by side: the sample page is where they are seen. */}
        <p data-testid="marks" className="mb-2 flex flex-wrap items-center gap-2">
          <Badge>right</Badge>
          <Badge variant="outline">wrong</Badge>
          <Badge variant="secondary">no pick</Badge>
          <Badge variant="live">live</Badge>
          <FavoriteMarker>favorite team</FavoriteMarker>
          <LiveMarker>2nd 12:34</LiveMarker>
        </p>
        <form onSubmit={bumpAndReadAgain} className="flex flex-wrap gap-2">
          <Button type="submit">Bump the Agent</Button>
          <Button type="button" variant="outline" size="sm">
            outline, small
          </Button>
        </form>
      </Section>

      <Section data-testid="join-cache">
        <SectionHeader title="2. Data cache on KV" count='60 seconds, tag "skeleton"' />
        <p className="my-2 text-muted-foreground">
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
        <PulseLive name={agentName} initial={pulse} />
      </Section>
    </>
  );
}
