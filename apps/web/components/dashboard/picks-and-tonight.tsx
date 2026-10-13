import type { SeasonRecord } from "@yogan-hockey/schemas";
import { picksNote, picksScore, tonightPicks } from "../../lib/agate-copy";
import { slateCounts } from "../../lib/scoreboard-view";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { label } from "./front";
import type { Picks } from "./roundup";

/** A block under the headlines: an ink rule over it, its label, and what it has to say. */
const block = "flex flex-col gap-[6px] border-rule border-t pt-3 md:min-h-[150px]";

/**
 * The Picks: the season's record in big serif figures and a line under it, "Right on 67% of
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
    <section aria-labelledby="picks-heading" data-slot="picks-box" className={block}>
      <h2 id="picks-heading" className={label}>
        The Picks
      </h2>
      {score != null && (
        <p
          data-slot="picks-record"
          className="whitespace-nowrap font-strong text-[64px] leading-none tracking-[-0.02em]"
        >
          {score}
        </p>
      )}
      {note != null && (
        <p data-slot="picks-note" className="text-[15px] text-muted-foreground">
          {note}
        </p>
      )}
    </section>
  );
}

/** Tonight at a glance: how many games are live, to come and final, each a figure over its word. */
export function Glance() {
  const counts = slateCounts([...useScoreboard().games]);
  const figures = [
    [counts.live, "Live"],
    [counts.upcoming, "To come"],
    [counts.final, "Final"],
  ] as const;
  return (
    <section aria-labelledby="glance-heading" data-slot="glance" className={block}>
      <h2 id="glance-heading" className={label}>
        Tonight at a glance
      </h2>
      <dl className="grid grid-cols-3 gap-3">
        {figures.map(([count, word]) => (
          // The figure is drawn over its word, and read after it.
          <div key={word} className="flex flex-col-reverse justify-end">
            <dt className={`${label} mt-[6px] whitespace-nowrap tracking-[0.1em]`}>{word}</dt>
            <dd className="font-strong text-[40px] leading-none">{count}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
