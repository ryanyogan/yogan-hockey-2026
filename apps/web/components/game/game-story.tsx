"use client";

import type { GameHeader } from "@yogan-hockey/schemas";
import { deck, headline, kicker } from "../../lib/agate-copy";
import { easternKicker, gameLineScore } from "../../lib/game/story";
import { useHydrated } from "../../lib/use-hydrated";
import { TeamMark } from "../team-mark";

/*
 * A story's type, as the prototype sets it (`.kicker`, `.headline`, `.deck`, `.pick` in
 * `prototypes/agate/style.css`). Home draws the same parts in `components/dashboard/roundup.tsx`;
 * the two are to share one set of tokens once Home's are in the theme.
 */
export const STORY_KICKER =
  "font-semibold text-[12px] text-kicker uppercase normal-nums leading-[1.35] tracking-[0.14em]";
export const STORY_HEADLINE =
  "text-balance font-bold font-serif text-[34px] normal-nums leading-[1.02] tracking-[-0.015em] [font-variation-settings:'opsz'_60] md:text-[clamp(34px,3vw,40px)]";
export const STORY_DECK =
  "font-serif text-[18px] text-note normal-nums leading-[1.4] md:text-[clamp(18px,1.4vw,19px)]";
/** "Our pick: Washington, 63%." in the serif's italic. */
export const STORY_PICK = "font-serif text-[17px] normal-nums italic leading-[1.4]";

const HEAD =
  "border-rule-head border-b py-[5px] text-right font-bold text-head text-label uppercase tracking-head first:text-left";
const ROW = "border-border border-b border-dotted py-[6px] text-score [tr:last-child>&]:border-b-0";
const CELL = `${ROW} text-right`;

/** Team, record and, once the puck has dropped, shots and the score: the visitors over the home side. */
function LineScore({ header }: { header: GameHeader }) {
  const { caption, score, sides } = gameLineScore(header);
  return (
    <table data-slot="line-score" className="w-full border-collapse border-rule border-y">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={HEAD}>
            Team
          </th>
          <th scope="col" className={`${HEAD} w-[72px] max-md:w-16`}>
            Rec
          </th>
          {score != null && (
            <>
              <th scope="col" className={`${HEAD} w-12`}>
                <abbr title="Shots on goal" className="no-underline">
                  SOG
                </abbr>
              </th>
              <th scope="col" className={`${HEAD} w-10`}>
                {score}
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {sides.map((side) => (
          <tr key={side.id}>
            <th
              scope="row"
              className={`${ROW} text-left ${side.winner ? "font-bold" : "font-normal"}`}
            >
              {/* The one place a club's mark is drawn on the page's header (HANDOFF.md, Q3). */}
              <TeamMark teamId={side.id} size="header" eager className="mr-2" />
              {side.name}
            </th>
            <td className={`${CELL} text-aside`}>{side.record}</td>
            {score != null && (
              <>
                <td data-slot="line-shots" className={`${CELL} text-aside`}>
                  {side.shots}
                </td>
                <td data-slot="line-score-figure" className={`${CELL} font-bold`}>
                  {side.score}
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The top of a game's page, written as a story of the roundup is (`docs/design/agate.md`): a heavy
 * rule, red while the game is on; the kicker; the headline, which is the page's title; the deck;
 * and the line score beside them, under them on a phone. Every sentence is `lib/agate-copy.ts`'s,
 * read from the header alone, so it moves with the Game Stream as the rink under it does.
 *
 * A start time is the NHL's zone on the server ("8:40 PM ET") and the visitor's own once the page
 * has hydrated, as `LocalTime` writes one.
 */
export function GameStory({ header }: { header: GameHeader }) {
  const hydrated = useHydrated();
  const live = header.status === "live";
  const shownOn = header.broadcasts.join(", ");
  return (
    <header
      data-slot="game-story"
      data-live={live ? "" : undefined}
      className="mb-6 grid items-start gap-x-8 gap-y-3 border-rule border-t-3 pt-[14px] data-live:border-live lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <p data-slot="kicker" className={STORY_KICKER}>
          {live && (
            // "Live" is in the words beside it.
            <span
              aria-hidden="true"
              data-slot="live-dot"
              className="mr-[6px] inline-block size-2 rounded-full bg-live align-[1px] motion-safe:animate-live"
            />
          )}
          {hydrated ? kicker(header) : easternKicker(header)}
        </p>
        <h1 data-slot="headline" className={STORY_HEADLINE}>
          {headline(header)}
        </h1>
        <p data-slot="deck" className={STORY_DECK}>
          {deck(header)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <LineScore header={header} />
        {shownOn !== "" && (
          <p data-slot="on-tv" className="text-aside text-small">
            <strong className="font-semibold text-foreground">On TV</strong> {shownOn}
          </p>
        )}
      </div>
    </header>
  );
}
