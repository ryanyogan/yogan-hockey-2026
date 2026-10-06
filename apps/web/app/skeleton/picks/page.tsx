import { Button } from "@yogan-hockey/ui/components/button";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seedPicks } from "../actions";

export const metadata: Metadata = { title: "Sample picks" };
export const dynamic = "force-dynamic";

/*
 * Scaffolding for #53, in fixture mode only (anywhere else it is not found): writes sample
 * picks to the local D1, where no model can make one. The Playwright setup and
 * `scripts/picks-shots.ts` press these buttons; `?seeded=` says the rows are in.
 */
export default async function SamplePicksPage({
  searchParams,
}: {
  searchParams: Promise<{ seeded?: string }>;
}) {
  if (process.env.ESPN_FIXTURES !== "1") notFound();
  const { seeded } = await searchParams;
  return (
    <Section>
      <SectionHeader title="Sample picks" count="fixture mode" />
      <p className="mb-2 max-w-prose text-foreground/70">
        A pick for every game of the recorded slate but one, whose Prediction failed; a pick for the
        recorded final, Dallas 4 at Buffalo 3, right or wrong; and five decided games for the season
        record.
      </p>
      <form action={seedPicks} className="flex flex-wrap gap-2">
        <Button type="submit" name="final" value="right">
          Seed picks, the final's right
        </Button>
        <Button type="submit" name="final" value="wrong" variant="outline">
          Seed picks, the final's wrong
        </Button>
      </form>
      {seeded && (
        <p data-slot="picks-seeded" className="mt-2">
          Seeded: the final's pick is {seeded}.
        </p>
      )}
    </Section>
  );
}
