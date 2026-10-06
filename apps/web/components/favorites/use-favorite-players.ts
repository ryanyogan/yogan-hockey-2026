"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveFavoritePlayers } from "../../app/players/actions";
import type { FavoritePlayer } from "../../lib/favorite-players";
import { MAX_FAVORITES } from "../../lib/favorites";
import { useFavorites } from "../../lib/use-favorites";

export type ResolvedFavoritePlayers = {
  /**
   * `waiting`: the browser's favorites are not read yet, or their players are still being asked
   * for. `empty`: there is nobody to list (no favorites, or none that resolved).`listed`: `players` is the list.
   */
  status: "waiting" | "empty" | "listed";
  /** The favorite players that resolved, oldest favorite first, at most `limit` of them. */
  players: FavoritePlayer[];
  /** Some favorite could not be read just now, so the list may be short. */
  unavailable: boolean;
};

/**
 * The visitor's favorite players as rows to show: the ids from the browser, resolved by the
 * `resolveFavoritePlayers` Server Action. `limit` is how many the caller shows (the dashboard's
 * four); only those are asked for.
 *
 * A player is asked for once. Taking a heart off removes his row at once without asking again,
 * and a new favorite, made on this page or in another tab, asks for him alone.
 */
export function useFavoritePlayers(limit: number = MAX_FAVORITES): ResolvedFavoritePlayers {
  const { ids, ready } = useFavorites("player");
  // Null is an id asked for that resolved to nobody: skipped, and not asked for again.
  const [known, setKnown] = useState<ReadonlyMap<string, FavoritePlayer | null>>(new Map());
  const [unavailable, setUnavailable] = useState(false);

  const wanted = useMemo(() => ids.slice(0, limit), [ids, limit]);
  const missing = wanted.filter((id) => !known.has(id)).join(",");

  useEffect(() => {
    if (missing === "") return;
    const asked = missing.split(",");
    let superseded = false;
    const answer = (players: FavoritePlayer[], failed: boolean) => {
      if (superseded) return;
      setKnown((before) => {
        const after = new Map(before);
        for (const id of asked) after.set(id, players.find((player) => player.id === id) ?? null);
        return after;
      });
      setUnavailable(failed);
    };
    // No answer at all is a tab older than the last deploy: vinext reloads the page itself.
    resolveFavoritePlayers(asked).then(
      (resolved) => answer(resolved?.players ?? [], resolved?.unavailable ?? true),
      () => answer([], true),
    );
    return () => {
      superseded = true;
    };
  }, [missing]);

  const players = wanted.flatMap((id) => known.get(id) ?? []);
  if (!ready) return { status: "waiting", players: [], unavailable: false };
  if (wanted.length === 0) return { status: "empty", players: [], unavailable: false };
  if (players.length > 0) return { status: "listed", players, unavailable };
  // Nobody to show: still asking, or every id was nobody's (or could not be read).
  return { status: missing === "" ? "empty" : "waiting", players, unavailable };
}
