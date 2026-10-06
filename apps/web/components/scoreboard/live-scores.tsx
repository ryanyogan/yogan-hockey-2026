"use client";

import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { favoritesFirst } from "../../lib/favorites";
import { slateDay } from "../../lib/game-time";
import { pickNote } from "../../lib/picks";
import { slateSections } from "../../lib/scoreboard-view";
import { useFavorites } from "../../lib/use-favorites";
import { LocalTime } from "../local-time";
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
        pick={(game) => pickNote(picks[game.id], game.status)}
      />
    </Section>
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
      <header className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="font-bold uppercase">
          Live scores
          <span className="font-normal text-foreground/50 normal-case"> {summary.join(", ")}</span>
        </h1>
        {heardAt && (
          <p className="text-foreground/50">
            updated <LocalTime at={heardAt} show="clock" />
          </p>
        )}
      </header>
      <Games title="In progress" games={sections.live} picks={picks} />
      <Games title="Upcoming" games={sections.upcoming} picks={picks} />
      <Games title="Final" games={sections.final} picks={picks} />
      <Games title="Postponed" games={sections.postponed} picks={picks} />
      {games.length === 0 && (
        <Section>
          {/* Without a date the Scoreboard has not answered yet, which is not a day off. */}
          <SectionHeader title={date == null ? "Scores unavailable" : "No games today"} />
          <p className="border-foreground/20 border-t px-2 py-1.5 text-foreground/70">
            {date == null
              ? "Today's games could not be read. They appear here as soon as they can be."
              : "Nothing is on the NHL's slate. Scores appear here as soon as there is a game."}
          </p>
        </Section>
      )}
    </>
  );
}
