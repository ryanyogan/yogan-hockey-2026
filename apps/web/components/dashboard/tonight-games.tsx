"use client";

import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { ReactNode } from "react";
import { tonightGames, tonightSummary } from "../../lib/dashboard";
import { pickNote } from "../../lib/picks";
import { useFavorites } from "../../lib/use-favorites";
import { Link } from "../link";
import { GameLedger } from "../scoreboard/game-ledger";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { EmptyLedger } from "../team/empty-ledger";
import { headerLink } from "./header-link";

/**
 * The dashboard's first block: tonight's games in stable start order, kept current by the
 * Scoreboard socket. Favorites are marked without moving their rows.
 *
 * The picks are not this component's to read (they are in D1, and this is the browser). The
 * page, a server component, hands them in:
 *
 * - `picks`: what to say in each game's AI-pick column, by game id: "TOR 58%", "pick pending".
 *   A game with no entry shows No pick; it never invents a probability.
 * - `record`: the season record of the picks, "picks: 34 right, 21 wrong", at the right-hand end
 *   of the header line.
 */
export function TonightGames({
  picks,
  record,
}: {
  picks?: Readonly<Record<string, ReactNode>>;
  record?: ReactNode;
}) {
  const { date, games } = useScoreboard();
  const favoriteTeamIds = useFavorites("team").ids;
  return (
    <Section aria-label="Tonight">
      <SectionHeader title="Tonight" count={tonightSummary(games)}>
        <span className="flex flex-wrap gap-x-4">
          {record != null && <span data-slot="picks-record">{record}</span>}
          <Link href="/nhl/live" className={headerLink}>
            all scores
          </Link>
        </span>
      </SectionHeader>
      {games.length > 0 ? (
        <GameLedger
          games={tonightGames(games)}
          favoriteTeamIds={favoriteTeamIds}
          pick={
            picks &&
            ((game) => {
              const pick = picks[game.id];
              // The picks are as old as the page's render: a game that has started since is no
              // longer waiting for one.
              return typeof pick === "string" ? pickNote(pick, game.status) : pick;
            })
          }
        />
      ) : (
        // Without a date the Scoreboard has not answered yet, which is not a day off.
        <EmptyLedger>
          {date == null
            ? "Today's games could not be read. They appear here as soon as they can be."
            : "No games scheduled today."}
        </EmptyLedger>
      )}
    </Section>
  );
}
