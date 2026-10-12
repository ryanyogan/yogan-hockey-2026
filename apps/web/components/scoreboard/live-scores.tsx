"use client";

import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { PageHeader, Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { favoritesFirst } from "../../lib/favorites";
import { slateDay } from "../../lib/game-time";
import { pickLineOutcome, pickNote } from "../../lib/picks";
import { slateSections } from "../../lib/scoreboard-view";
import { useFavorites } from "../../lib/use-favorites";
import { LocalTime } from "../local-time";
import { PickMark } from "../story/story-parts";
import { emptyProse } from "../story/type";
import { GameLedger } from "./game-ledger";
import { useScoreboard } from "./scoreboard-provider";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Each game's pick in one line, by game id, as the page's server component read them. */
type Picks = Readonly<Record<string, string>>;

function Games({ title, games, picks }: { title: string; games: ScoreboardGame[]; picks: Picks }) {
  const favoriteTeamIds = useFavorites("team").ids;
  // A section with nothing in it is left out.
  if (games.length === 0) return null;
  return (
    <Section aria-label={title}>
      <SectionHeader title={title} count={games.length} />
      {/* Favorite teams' games lead each section, still in order of start among themselves. */}
      <GameLedger
        games={favoritesFirst(games, favoriteTeamIds)}
        favoriteTeamIds={favoriteTeamIds}
        pick={(game) => {
          const line = pickNote(picks[game.id], game.status);
          // A final's pick says how it went, as a brief on Home does.
          return line == null ? undefined : (
            <>
              {line}
              <PickMark outcome={pickLineOutcome(line, game)} />
            </>
          );
        }}
      />
    </Section>
  );
}

/**
 * The page's title, with the day's count and when the Scoreboard last heard from ESPN. On a phone
 * the "updated" stamp has a line of its own under the title, and the line is there before there
 * is anything to put on it: the placeholder (`LiveSkeleton`) draws this with nothing given, so
 * the page does not move when the socket first speaks.
 */
export function ScoresTitle({ count, heardAt }: { count?: string; heardAt?: string | null }) {
  return (
    <PageHeader
      title="Live scores"
      count={count || undefined}
      className="max-md:[&>[data-slot=page-aside]]:w-full"
    >
      {/* Meta, not a "more" link: the aside's capitals and tracking are put back. */}
      <p className="font-quiet text-aside normal-case tracking-normal max-md:min-h-[1lh]">
        {heardAt && (
          <>
            updated <LocalTime at={heardAt} show="clock" />
          </>
        )}
      </p>
    </PageHeader>
  );
}

/**
 * `/nhl/live`: today's games by where each stands, kept current by the Scoreboard socket. `picks`
 * is as old as the page's last render, so a "pick pending" is checked against the game's status.
 */
export function LiveScores({ picks = {} }: { picks?: Picks }) {
  const { date, games, heardAt } = useScoreboard();
  const sections = slateSections(games);
  const summary = [
    date && slateDay(date),
    games.length > 0 && plural(games.length, "game"),
    sections.live.length > 0 && `${sections.live.length} live`,
  ].filter(Boolean);

  return (
    <>
      <ScoresTitle count={summary.join(", ")} heardAt={heardAt} />
      <Games title="In progress" games={sections.live} picks={picks} />
      <Games title="Upcoming" games={sections.upcoming} picks={picks} />
      <Games title="Final" games={sections.final} picks={picks} />
      <Games title="Postponed" games={sections.postponed} picks={picks} />
      {games.length === 0 && (
        <Section>
          {/* Without a date the Scoreboard has not answered yet, which is not a day off. */}
          <SectionHeader title={date == null ? "Scores unavailable" : "No games today"} />
          <p className={`py-2 ${emptyProse}`}>
            {date == null
              ? "Today's games could not be read. They appear here as soon as they can be."
              : "Nothing is on the NHL's slate. Scores appear here as soon as there is a game."}
          </p>
        </Section>
      )}
    </>
  );
}
