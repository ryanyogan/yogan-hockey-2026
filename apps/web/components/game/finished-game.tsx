"use client";

import type { GameHeader, Play } from "@yogan-hockey/schemas";
import { type ReactNode, useEffect, useState } from "react";
import { loadReplayPlays } from "../../app/nhl/games/[id]/actions";
import type { GameTab } from "../../lib/game/tabs";
import { GameView } from "./game-view";
import { Replay, ReplayPending } from "./replay";

export type FinishedGameProps = {
  /** ESPN's event id: what the Replay asks D1 for. */
  gameId: string;
  header: GameHeader;
  /**
   * Every play of the game. From D1 when the page opened on a game already archived; otherwise
   * what the Game Stream received, or the Game Agent's snapshot, which are shown for browsing
   * until D1 has the game.
   */
  plays: readonly Play[];
  /**
   * The game and its plays are in D1. On a page that watched the game end it turns true about 30
   * seconds after `header.status` turns final.
   */
  archived: boolean;
  /** A warning under the status: the stream's "Updates delayed", if it ended that way. */
  notice?: string;
  tab: GameTab;
  pathname: string;
  /** What "the pick" tab shows: #53 marks it right or wrong here. */
  pick: ReactNode;
};

/** How often, and how many times, a page waiting for the archive asks for the Replay's plays. */
const ASK_AGAIN_MILLISECONDS = 10_000;
const ASKS = 12;

/**
 * A finished game on `/nhl/games/:id`: the Replay, which draws only what D1 holds.
 *
 * A page opened on an archived game was handed D1's plays by the server and is the Replay at
 * once. Any other (the game ended on this open page, or it could not be archived as the page was
 * read) lays the game out for browsing with the plays it has and asks the server for D1's: at
 * once when `archived` turns true, and every 10 seconds until then, for two minutes. It becomes
 * the Replay when they arrive, with no reload and nothing on the page moving.
 */
export function FinishedGame({
  gameId,
  header,
  plays,
  archived,
  notice,
  tab,
  pathname,
  pick,
}: FinishedGameProps) {
  // Only plays the server read with the game already archived are D1's without asking.
  const [openedArchived] = useState(archived);
  const [loaded, setLoaded] = useState<readonly Play[] | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const waiting = !openedArchived && loaded == null;

  useEffect(() => {
    if (!waiting) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = async (asked: number) => {
      // The action answers null for anything it cannot serve; a throw is the call itself failing.
      const fromD1 = await loadReplayPlays(gameId).catch(() => null);
      if (stopped) return;
      if (fromD1 != null) setLoaded(fromD1);
      else if (asked < ASKS) timer = setTimeout(() => ask(asked + 1), ASK_AGAIN_MILLISECONDS);
      else setGaveUp(true);
    };
    if (archived) void ask(1);
    else timer = setTimeout(() => ask(1), ASK_AGAIN_MILLISECONDS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [gameId, archived, waiting]);

  const shared = { header, notice, tab, pathname, pick };
  if (waiting) {
    return <GameView {...shared} plays={plays} transport={<ReplayPending gaveUp={gaveUp} />} />;
  }
  return <Replay {...shared} plays={loaded ?? plays} />;
}
