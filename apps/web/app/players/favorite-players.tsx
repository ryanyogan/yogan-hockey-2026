"use client";

import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { FavoritePlayersLedger } from "../../components/favorites/favorite-players-ledger";
import { useFavoritePlayers } from "../../components/favorites/use-favorite-players";

/**
 * The visitor's favorite players, every one of them. The ids are the browser's, so the server
 * draws the section with one quiet line, and the list (or "none yet") takes its place once the
 * page has read them. It is the last thing on the page: nothing below it moves.
 */
export function FavoritePlayers() {
  const { status, players, unavailable } = useFavoritePlayers();
  const count = players.length === 1 ? "1 player" : `${players.length} players`;
  return (
    <Section aria-label="Favorites" aria-busy={status === "waiting"}>
      <SectionHeader title="Favorites" count={status === "waiting" ? undefined : count} />
      {status === "listed" ? (
        <FavoritePlayersLedger players={players} />
      ) : (
        <p className="border-foreground/20 border-t px-2 py-1.5 text-foreground/70">
          {status === "waiting"
            ? "Reading your favorites."
            : "No favorite players yet. Press the heart beside a player to keep him here."}
        </p>
      )}
      {unavailable && (
        <p role="status" className="px-2 py-1.5 text-foreground/70">
          Some favorites could not be read just now.
        </p>
      )}
    </Section>
  );
}
