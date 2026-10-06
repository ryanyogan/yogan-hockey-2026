"use client";

import type { GameHeader, Play } from "@yogan-hockey/schemas";
import type { ReactNode } from "react";
import type { GameTab } from "../../lib/game/tabs";
import { GameView } from "./game-view";

export type FinishedGameProps = {
  /** ESPN's event id: what the Replay asks D1 for. */
  gameId: string;
  header: GameHeader;
  /**
   * Every play of the game: as the Game Stream received them when the game ended on an open
   * page, or from the Game Agent's snapshot when the page was opened after the final.
   */
  plays: readonly Play[];
  /**
   * The game and its plays are in D1. On a page that watched the game end it turns true about 30
   * seconds after `header.status` turns final; the Replay reads D1 only once it has.
   */
  archived: boolean;
  /** A warning under the status: the stream's "Updates delayed", if it ended that way. */
  notice?: string;
  tab: GameTab;
  pathname: string;
  /** What "the pick" tab shows: #53 marks it right or wrong here. */
  pick: ReactNode;
};

/**
 * A finished game on `/nhl/games/:id`, and the seam for the Replay (#51).
 *
 * Today it lays the whole game out for browsing with the plays it is handed. The Replay replaces
 * this component's body and nothing outside it: it holds a playhead and feeds `GameView`
 * `plays.slice(0, playhead)` with `selectedId` and `onSelect`, adds play, pause and speed, and
 * takes its plays from D1 once `archived` is true (the page's server component is where a game
 * nobody watched is archived first: see `app/nhl/games/[id]/page.tsx`).
 */
export function FinishedGame({ header, plays, notice, tab, pathname, pick }: FinishedGameProps) {
  return (
    <GameView
      header={header}
      plays={plays}
      tab={tab}
      pathname={pathname}
      pick={pick}
      notice={notice}
    />
  );
}
