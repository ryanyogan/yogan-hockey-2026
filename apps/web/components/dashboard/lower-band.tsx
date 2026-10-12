import type { SeasonRecord } from "@yogan-hockey/schemas";
import { tabCellVariants, tabStrip } from "@yogan-hockey/ui/components/url-tabs";
import { type ReactNode, useState } from "react";
import { picksNote, picksScore, tonightPicks } from "../../lib/agate-copy";
import { slateCounts } from "../../lib/scoreboard-view";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { label, ruledLabel } from "./agate";
import type { Picks } from "./roundup";

/**
 * The Picks box: the season's record in big serif figures and a line under it, "Right on 67% of
 * games this season. Two of three tonight." The season is the server's read; tonight's tally is
 * worked out here from the socket's scores, so it moves as the games end. Nothing is drawn before
 * a pick has been decided.
 */
export function PicksBox({ picks, record }: { picks: Picks; record: SeasonRecord | null }) {
  const { games } = useScoreboard();
  const score = picksScore(record);
  const note = picksNote(record, tonightPicks(games, new Map(Object.entries(picks))));
  if (score == null && note == null) return null;
  return (
    <section
      aria-labelledby="picks-heading"
      data-slot="picks-box"
      className="border border-rule px-5 py-[18px] max-md:order-1 max-md:flex max-md:items-center max-md:gap-4 max-md:px-4 max-md:py-[14px]"
    >
      <div className="flex-none">
        <h2 id="picks-heading" className={label}>
          The Picks
        </h2>
        {score != null && (
          <p
            data-slot="picks-record"
            className="mt-2 whitespace-nowrap font-serif font-strong text-stat lining-nums max-md:mt-0.5"
          >
            {score}
          </p>
        )}
      </div>
      {note != null && (
        <p
          data-slot="picks-note"
          className="mt-1.5 font-serif text-note text-prose normal-nums leading-[1.4] max-md:mt-0 max-md:text-[16px]"
        >
          {note}
        </p>
      )}
    </section>
  );
}

/** Tonight at a glance: how many games are live, to come and final. The phone's dateline says it. */
export function Glance() {
  const counts = slateCounts([...useScoreboard().games]);
  const figures = [
    [counts.live, "Live"],
    [counts.upcoming, "To come"],
    [counts.final, "Final"],
  ] as const;
  return (
    <section aria-labelledby="glance-heading" data-slot="glance" className="max-md:hidden">
      <h2 id="glance-heading" className={ruledLabel}>
        Tonight at a glance
      </h2>
      <dl className="grid grid-cols-3 border-rule-head border-b text-center">
        {figures.map(([count, word]) => (
          <div
            key={word}
            className="flex flex-col-reverse border-rule-head py-[10px] not-first:border-l"
          >
            <dt className="text-[12px] text-label uppercase tracking-mark">{word}</dt>
            <dd className="font-serif font-strong text-figure normal-nums">{count}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** One conference's table, and the word its button says: "Eastern". */
export type ConferenceTable = { name: string; short: string; table: ReactNode };

/**
 * The conferences' tables, drawn on the server: side by side from `md` up, each under its red
 * label; on a phone one at a time, chosen by the Eastern/Western control above them.
 */
export function Conferences({ conferences }: { conferences: ConferenceTable[] }) {
  const [shown, setShown] = useState(0);
  return (
    <>
      {conferences.length > 1 && (
        // biome-ignore lint/a11y/useSemanticElements: a pair of toggle buttons, not a form's fieldset.
        <div role="group" aria-label="Conference" className={`${tabStrip} mt-2 mb-2.5 md:hidden`}>
          {conferences.map(({ name, short }, index) => (
            <button
              key={name}
              type="button"
              aria-pressed={index === shown}
              onClick={() => setShown(index)}
              className={tabCellVariants({ current: index === shown, className: "normal-nums" })}
            >
              {short}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-7 max-md:block md:gap-8">
        {conferences.map(({ name, table }, index) => (
          <div key={name} data-slot="conference" className={index === shown ? "" : "max-md:hidden"}>
            {table}
          </div>
        ))}
      </div>
    </>
  );
}
