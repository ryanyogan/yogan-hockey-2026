"use client";

import type { ScoreboardReading, ScoreboardState } from "@yogan-hockey/schemas";
import { useAgent } from "agents/react";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { SCOREBOARD_CONNECTION } from "../../lib/scoreboard-connection";
import { heardAtFrom, laterOf } from "../../lib/scoreboard-view";
import { useDropWatch } from "../../lib/use-drop-watch";
import { useRefreshOnInvalidation } from "../../lib/use-refresh-on-invalidation";

const ScoreboardContext = createContext<ScoreboardReading | null>(null);
/** Whether the Scoreboard's socket has been down for longer than a blip. */
const ScoreboardDroppedContext = createContext(false);

/**
 * The page's one socket to the Scoreboard Agent. The root layout renders it around every page with
 * the games read for first paint; from then on the Agent pushes each change. Anything that shows
 * today's games reads them with `useScoreboard()` and opens no socket of its own.
 *
 * Two things arrive on the socket. The state, whenever a poll finds something different; and,
 * after a poll that finds nothing new, only the time ESPN was heard from, which is what keeps
 * `heardAt` moving on a quiet slate.
 *
 * When the Scoreboard has invalidated cached data (a game went final, or a catch-up recorded
 * games), what the server rendered is out of date: `invalidatedAt` moves and the page's server
 * components are rendered again.
 *
 * While the socket is down the scores on the page stand still; `useScoreboardDropped()` says so
 * once that has lasted longer than a reconnect usually takes, and the shell tells the visitor.
 */
export function ScoreboardProvider({
  initial,
  children,
}: {
  initial: ScoreboardReading;
  children: ReactNode;
}) {
  const [state, setState] = useState<ScoreboardState>(initial);
  const [lastHeardAt, setLastHeardAt] = useState(initial.heardAt);
  const drop = useDropWatch();

  useAgent<ScoreboardState>({
    ...SCOREBOARD_CONNECTION,
    onOpen: drop.opened,
    onClose: drop.closed,
    onStateUpdate: (next) => setState(next),
    onMessage: (message) => {
      const at = heardAtFrom(message.data);
      if (at != null) setLastHeardAt(at);
    },
  });
  useRefreshOnInvalidation(state.invalidatedAt);

  const scoreboard = useMemo(
    // A state that arrives is itself news from ESPN, so the later of the two is the answer.
    () => ({ ...state, heardAt: laterOf(state.updatedAt, lastHeardAt) }),
    [state, lastHeardAt],
  );
  return (
    <ScoreboardContext value={scoreboard}>
      <ScoreboardDroppedContext value={drop.dropped}>{children}</ScoreboardDroppedContext>
    </ScoreboardContext>
  );
}

/**
 * Whether the page has lost its Scoreboard socket for more than a few seconds, so the scores it
 * shows may be behind. False again as soon as the socket is back.
 */
export function useScoreboardDropped(): boolean {
  return useContext(ScoreboardDroppedContext);
}

/**
 * Supplies a fixed slate with no socket, to whatever is rendered inside it. For sample pages
 * (`/skeleton/live`); a real page is already inside the layout's `ScoreboardProvider`.
 */
export function StaticScoreboard({
  scoreboard,
  children,
}: {
  scoreboard: ScoreboardState;
  children: ReactNode;
}) {
  const reading = useMemo(() => ({ ...scoreboard, heardAt: scoreboard.updatedAt }), [scoreboard]);
  return <ScoreboardContext value={reading}>{children}</ScoreboardContext>;
}

/**
 * Today's games, current without a refresh: `{ date, games, heardAt }`, with the rest of the
 * Scoreboard's state. `heardAt` is when the Scoreboard last heard from ESPN and is what an
 * "updated" stamp shows; `updatedAt` is when the games last changed. Call it in any client
 * component; `lib/scoreboard-view.ts` has the status line, the sections and the ticker's order.
 */
export function useScoreboard(): ScoreboardReading {
  const scoreboard = useContext(ScoreboardContext);
  if (scoreboard == null) throw new Error("useScoreboard needs the layout's ScoreboardProvider");
  return scoreboard;
}
