"use client";

import type { ScoreboardGame } from "@yogan-hockey/schemas";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { useState } from "react";
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

function Games({
  title,
  games,
  picks,
  favoriteTeamIds,
  leadingTeamIds,
}: {
  title: string;
  games: ScoreboardGame[];
  picks: Picks;
  /** The favorite teams as they now are: their games are marked. */
  favoriteTeamIds: readonly string[];
  /** The favorite teams the page knew of when it was first drawn: their games lead. */
  leadingTeamIds: readonly string[];
}) {
  // A section with nothing in it is left out.
  if (games.length === 0) return null;
  return (
    <Section aria-label={title}>
      <SectionHeader title={title} count={games.length} />
      {/* Favorite teams' games lead each section, still in order of start among themselves. */}
      <GameLedger
        games={favoritesFirst(games, leadingTeamIds)}
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
  const favoriteTeamIds = useFavorites("team").ids;
  // Taken once (#127). A page the server drew knows no favorites until the browser's storage is
  // read, after the first paint: a row that then took its section's lead would move under the
  // visitor, so there the favorite is marked where it stands, as the ticker does. Arrived at by
  // a link, the page is first drawn with the favorites known, and they lead.
  const [leadingTeamIds] = useState(favoriteTeamIds);
  const sections = slateSections(games);
  const shared = { picks, favoriteTeamIds, leadingTeamIds };
  const summary = [
    date && slateDay(date),
    games.length > 0 && plural(games.length, "game"),
    sections.live.length > 0 && `${sections.live.length} live`,
  ].filter(Boolean);

  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="font-strong uppercase">
          Live scores
          <span className="font-quiet text-label normal-case"> {summary.join(", ")}</span>
        </h1>
        {heardAt && (
          <p className="text-label">
            updated <LocalTime at={heardAt} show="clock" />
          </p>
        )}
      </header>
      <Games title="In progress" games={sections.live} {...shared} />
      <Games title="Upcoming" games={sections.upcoming} {...shared} />
      <Games title="Final" games={sections.final} {...shared} />
      <Games title="Postponed" games={sections.postponed} {...shared} />
      {games.length === 0 && (
        <Section>
          {/* Without a date the Scoreboard has not answered yet, which is not a day off. */}
          <SectionHeader title={date == null ? "Scores unavailable" : "No games today"} />
          <p className="border-rule-head border-t px-2 py-row text-note">
            {date == null
              ? "Today's games could not be read. They appear here as soon as they can be."
              : "Nothing is on the NHL's slate. Scores appear here as soon as there is a game."}
          </p>
        </Section>
      )}
    </>
  );
}
