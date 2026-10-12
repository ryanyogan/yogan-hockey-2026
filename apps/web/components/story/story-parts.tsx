import { badgeVariants } from "@yogan-hockey/ui/components/badge";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { liveDot } from "@yogan-hockey/ui/components/marker";
import { kicker, rec } from "../../lib/agate-copy";
import { NHL_TIME_ZONE } from "../../lib/game-time";
import { lineScore, type StoryGame } from "../../lib/story";
import { useHydrated } from "../../lib/use-hydrated";
import { TeamMark } from "../team-mark";
import { fitted, storyKicker, storyOnTv } from "./type";

/*
 * The parts of a story that a lead on Home (`components/dashboard/roundup.tsx`) and a game page's
 * header (`components/game/game-story.tsx`) both draw: the kicker, the line score, the mark on a
 * pick and the TV line. Their type is `./type.ts`'s; their words are `lib/agate-copy.ts`'s.
 */

/**
 * The zone a start time is written in, and its mark. The server knows only the NHL's, and writes
 * "8:40 PM ET"; the browser writes the visitor's own once the page has hydrated, as `LocalTime`
 * does, so the two never disagree about the same markup.
 */
export type Zone = [timeZone: string | undefined, mark: string];
export const useZone = (): Zone => (useHydrated() ? [undefined, ""] : [NHL_TIME_ZONE, " ET"]);

/** The red line above a headline, with the live dot before it while the game is on. */
export function StoryKicker({ game, zone }: { game: StoryGame; zone: Zone }) {
  return (
    <p data-slot="kicker" className={storyKicker}>
      {game.status === "live" && (
        // "Live" is in the words beside it.
        <span aria-hidden="true" data-slot="live-dot" className={liveDot} />
      )}
      {kicker(game, ...zone)}
    </p>
  );
}

/**
 * Right (filled) or Wrong (outlined) beside a final's pick: a `Badge`'s two marks, upright in an
 * italic sentence. Nothing before the game is final.
 */
export function PickMark({
  outcome,
  className = "",
}: {
  outcome: "right" | "wrong" | null;
  className?: string;
}) {
  if (outcome == null) return null;
  return (
    <span
      data-slot="pick-outcome"
      data-outcome={outcome}
      className={badgeVariants({
        variant: outcome === "right" ? "default" : "outline",
        className: `ml-1 font-agate not-italic normal-nums ${className}`,
      })}
    >
      {outcome === "right" ? "Right" : "Wrong"}
    </span>
  );
}

/**
 * Team, record and, once there is a score, the shots (where the page knows them) and the score:
 * the away side over the home side. `marks` draws each club's mark before its name, which only a
 * game page's header does (agate.md, Decisions).
 */
export function StoryLineScore({ game, marks = false }: { game: StoryGame; marks?: boolean }) {
  const { caption, score, sides } = lineScore(game);
  const shots = score != null && sides.some((side) => side.shots != null);
  // A line score's figures are a size larger than a table's, at every width.
  const figure = `${fitted.cell} py-1.5 text-score`;
  const record = "w-[72px] max-md:w-16";
  return (
    <Ledger data-slot="line-score" className="border-rule border-y">
      <caption className="sr-only">{caption}</caption>
      <LedgerHead>
        <LedgerColumn className={fitted.head}>Team</LedgerColumn>
        <LedgerColumn numeric className={`${fitted.head} ${record}`}>
          <abbr title="Record" className="no-underline">
            Rec
          </abbr>
        </LedgerColumn>
        {shots && (
          <LedgerColumn numeric className={`${fitted.head} w-12`}>
            <abbr title="Shots on goal" className="no-underline">
              SOG
            </abbr>
          </LedgerColumn>
        )}
        {score != null && (
          <LedgerColumn numeric className={`${fitted.head} w-10`}>
            {score === "F" ? (
              <abbr title="Final" className="no-underline">
                F
              </abbr>
            ) : (
              score
            )}
          </LedgerColumn>
        )}
      </LedgerHead>
      <LedgerBody>
        {sides.map((side) => (
          <LedgerRow key={side.id} className={fitted.row}>
            <th
              scope="row"
              className={`py-1.5 text-left text-score normal-nums ${side.winner ? "font-strong" : "font-body"}`}
            >
              {marks && <TeamMark teamId={side.id} size="header" eager className="mr-2" />}
              {side.name}
            </th>
            <LedgerCell numeric tone="aside" className={`${figure} ${record}`}>
              {side.record == null ? "" : rec(side.record)}
            </LedgerCell>
            {shots && (
              <LedgerCell numeric tone="aside" data-slot="line-shots" className={`${figure} w-12`}>
                {side.shots ?? ""}
              </LedgerCell>
            )}
            {side.score != null && (
              <LedgerCell
                numeric
                tone={side.winner ? "strong" : "default"}
                className={`${figure} w-10`}
              >
                {side.score}
              </LedgerCell>
            )}
          </LedgerRow>
        ))}
      </LedgerBody>
    </Ledger>
  );
}

/** "On TV ESPN+, TNT"; nothing for a game nobody is showing. */
export function OnTv({ broadcasts }: { broadcasts: readonly string[] | undefined }) {
  const shownOn = broadcasts?.join(", ");
  if (!shownOn) return null;
  return (
    <p data-slot="on-tv" className={storyOnTv}>
      <strong className="font-semibold text-foreground">On TV</strong> {shownOn}
    </p>
  );
}
