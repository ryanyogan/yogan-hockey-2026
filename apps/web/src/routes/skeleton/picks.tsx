import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@yogan-hockey/ui/components/button";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { FormEvent } from "react";
import { readSamplePicksPage, seedPicks } from "../../functions/skeleton";
import { titled } from "../../head";

/*
 * Scaffolding for #53, in fixture mode only (anywhere else it is not found): writes sample
 * picks to the local D1, where no model can make one. The Playwright setup and
 * `scripts/picks-shots.ts` press these buttons; `?seeded=` says the rows are in.
 */
export const Route = createFileRoute("/skeleton/picks")({
  validateSearch: (search: Record<string, unknown>): { seeded?: string } =>
    typeof search.seeded === "string" && search.seeded !== "" ? { seeded: search.seeded } : {},
  loader: () => readSamplePicksPage(),
  head: ({ match }) => titled(match, "Sample picks"),
  component: SamplePicksPage,
});

function SamplePicksPage() {
  const { seeded } = Route.useSearch();
  const seed = useServerFn(seedPicks);

  // The button pressed says which way the final's pick goes, as a form's submitter does.
  function seedFromButton(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { submitter } = event.nativeEvent as SubmitEvent;
    const wrong = submitter instanceof HTMLButtonElement && submitter.value === "wrong";
    void seed({ data: { final: wrong ? "wrong" : "right" } });
  }

  return (
    <Section>
      <SectionHeader title="Sample picks" count="fixture mode" />
      <p className="mb-2 max-w-prose text-muted-foreground">
        A pick for every game of the recorded slate but one, whose Prediction failed; a pick for the
        recorded final, Dallas 4 at Buffalo 3, right or wrong; and five decided games for the season
        record.
      </p>
      <form onSubmit={seedFromButton} className="flex flex-wrap gap-2">
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
