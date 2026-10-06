"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import useLocalStorageState from "use-local-storage-state";
import { FAVORITE_KEYS, type FavoriteKind, readFavoriteIds, toggleFavorite } from "./favorites";

const NONE: readonly string[] = [];
const subscribeToNothing = () => () => {};

/**
 * False on the server and while the page hydrates, true from then on. Until it is true the
 * browser's favorites have not been read, so "no favorites" is not yet known to be so.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export type Favorites = {
  /** The favorite ids, oldest first. Empty on the server and until the page has hydrated. */
  ids: readonly string[];
  /** Whether `ids` is the browser's list, as opposed to the server's "nothing yet". */
  ready: boolean;
  has: (id: string) => boolean;
  /** Makes `id` a favorite, or stops it being one. Every tab and every heart follows. */
  toggle: (id: string) => void;
};

/**
 * The visitor's favorite players or favorite teams: the one way anything reads or changes them.
 *
 * The server renders "not a favorite" and so does the browser's first render, which is what
 * makes hydration agree; the stored list arrives in the render after. A heart is therefore
 * always drawn and only fills in, and a list waits for `ready` before saying it is empty.
 * `use-local-storage-state` keeps every caller on the page and every other tab in step, and
 * falls back to memory when the browser refuses storage (private windows, a full quota).
 */
export function useFavorites(kind: FavoriteKind): Favorites {
  const [stored, setStored] = useLocalStorageState<unknown>(FAVORITE_KEYS[kind], {
    defaultValue: NONE,
  });
  const ready = useHydrated();
  // Whatever is stored is read, never trusted: a value that is not a list of ids is no favorites.
  const ids = useMemo(() => readFavoriteIds(stored), [stored]);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback(
    (id: string) => setStored((current: unknown) => toggleFavorite(readFavoriteIds(current), id)),
    [setStored],
  );
  return { ids, ready, has, toggle };
}
