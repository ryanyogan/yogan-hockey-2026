"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveFavoritePlayers } from "../../app/players/actions";
import type { FavoritePlayer } from "../../lib/favorite-players";
import { MAX_FAVORITES } from "../../lib/favorites";
import { useFavorites } from "../../lib/use-favorites";

export type ResolvedFavoritePlayers = {
  /**
   * `waiting`: the browser's favorites are not read yet, or their players are still being asked
   * for. `empty`: there is nobody to list (no favorites, or none that resolved). `listed`:
   * `players` is the list.
   */
  status: "waiting" | "empty" | "listed";
  /** The favorite players that resolved, oldest favorite first, at most `limit` of them. */
  players: FavoritePlayer[];
  /** Some favorite could not be read just now, so the list is short; with `empty`, not empty. */
  unavailable: boolean;
};

/** What asking for an id came to: the player, nobody (null), or no answer this time. */
type Answer = FavoritePlayer | "unread" | null;

/**
 * The visitor's favorite players as rows to show: the ids from the browser, resolved by the
 * `resolveFavoritePlayers` Server Action. `limit` is how many the caller shows (the dashboard's
 * four): the oldest `limit` favorites are asked for, so one of them that is nobody's leaves the
 * list one short.
 *
 * A player is asked for once. Taking a heart off removes his row at once without asking again,
 * and a new favorite, made on this page or in another tab, asks for him alone. One that could
 * not be read is asked for again when the page is next opened.
 */
export function useFavoritePlayers(limit: number = MAX_FAVORITES): ResolvedFavoritePlayers {
  const { ids, ready } = useFavorites("player");
  const [known, setKnown] = useState<ReadonlyMap<string, Answer>>(new Map());

  const wanted = useMemo(() => ids.slice(0, limit), [ids, limit]);
  const missing = wanted.filter((id) => !known.has(id)).join(",");

  useEffect(() => {
    if (missing === "") return;
    const asked = missing.split(",");
    let superseded = false;
    const answer = (players: FavoritePlayer[], unread: readonly string[] | null) => {
      if (superseded) return;
      setKnown((before) => {
        const after = new Map(before);
        for (const id of asked) {
          const player = players.find((each) => each.id === id);
          after.set(id, player ?? (unread === null || unread.includes(id) ? "unread" : null));
        }
        return after;
      });
    };
    // No answer at all is a tab older than the last deploy: vinext reloads the page itself.
    resolveFavoritePlayers(asked).then(
      (resolved) => answer(resolved?.players ?? [], resolved ? resolved.unread : null),
      () => answer([], null),
    );
    return () => {
      superseded = true;
    };
  }, [missing]);

  if (!ready) return { status: "waiting", players: [], unavailable: false };
  const answers = wanted.map((id) => known.get(id));
  const players = answers.filter((each) => each != null && each !== "unread");
  const unavailable = answers.includes("unread");
  if (players.length > 0) return { status: "listed", players, unavailable };
  // Nobody to show: still asking, or every id was nobody's or could not be read.
  return { status: missing === "" ? "empty" : "waiting", players, unavailable };
}
