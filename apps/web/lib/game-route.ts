import { findGame } from "./find-game";
import { perRequest } from "./per-request";
import { doNotKeepPage } from "./render-failure";

/** Shared by metadata, layout and the leaf's cache guard, including reused-layout requests. */
export const loadGame = (id: string) => perRequest(`game:${id}`, () => findGame(id));

/** A leaf must reject caching even when vinext reuses the browser's already-rendered layout. */
export async function guardGamePage(id: string) {
  const found = await loadGame(id);
  if (found.state !== "found" || !found.game.archived) doNotKeepPage();
  return found;
}
