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
 * The page's one socket to the Scoreboard Agent. The root route renders it around every page;
 * the Agent pushes each change. Anything that shows today's games reads them with
 * `useScoreboard()` and opens no socket of its own.
 *
 * `initial` is the root loader's read of the Scoreboard, which is in the first HTML: every page
 * is drawn with today's games from its first paint. Once the socket has spoken the games are the
 * socket's alone.
 *
 * Two things arrive on the socket. The state, whenever a poll finds something different; and,
 * after a poll that finds nothing new, only the time ESPN was heard from, which is what keeps
 * `heardAt` moving on a quiet slate.
 *
 * When the Scoreboard has forgotten cached data (a game went final, or a catch-up recorded
 * games), what the loaders read is out of date: `invalidatedAt` moves past the one the page was
 * drawn with, and the router's loaders are run again.
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
  const [state, setState] = useState<ScoreboardState | null>(null);
  const [lastHeardAt, setLastHeardAt] = useState<string | null>(null);
  const drop = useDropWatch();

  useAgent<ScoreboardState>({
    ...SCOREBOARD_CONNECTION,
    onOpen: drop.opened,
    onClose: drop.closed,
    onStateUpdate: setState,
    onMessage: (message) => {
      const at = heardAtFrom(message.data);
      if (at != null) setLastHeardAt((heardAt) => laterOf(heardAt, at));
    },
  });
  useRefreshOnInvalidation(
    initial.invalidatedAt ?? null,
    state == null ? undefined : (state.invalidatedAt ?? null),
  );

  const reading = useMemo<ScoreboardReading>(
    () =>
      state == null
        ? { ...initial, heardAt: laterOf(initial.heardAt, lastHeardAt) }
        : // A state that arrives is itself news from ESPN, so the later of the two is the answer.
          { ...state, heardAt: laterOf(state.updatedAt, laterOf(initial.heardAt, lastHeardAt)) },
    [state, lastHeardAt, initial],
  );
  return (
    <ScoreboardContext value={reading}>
      <ScoreboardDroppedContext value={drop.dropped}>{children}</ScoreboardDroppedContext>
    </ScoreboardContext>
  );
}

/** What a page shows of today's games when the Scoreboard could not be read: none. */
export const NO_READING: ScoreboardReading = {
  date: null,
  games: [],
  updatedAt: null,
  invalidatedAt: null,
  heardAt: null,
};

/**
 * Nothing any more: it held the place of whatever showed today's games until there were games to
 * show, and they are now in the first HTML. It draws its children, and is kept for the pages
 * still to be ported (#188 to #192), which drop it as they go.
 */
export function ScoreboardGate({ children }: { fallback: ReactNode; children: ReactNode }) {
  return children;
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
 * "updated" stamp shows; `updatedAt` is when the games last changed. Call it in any component;
 * `lib/scoreboard-view.ts` has the status line, the sections and the ticker's order.
 *
 * Until the socket has spoken it answers with the root loader's read, so it never waits.
 */
export function useScoreboard(): ScoreboardReading {
  const reading = useContext(ScoreboardContext);
  if (reading == null) throw new Error("useScoreboard needs the root route's ScoreboardProvider");
  return reading;
}

/**
 * `useScoreboard()`, which no longer waits for anything. Kept for the pages still to be ported
 * (#188 to #192), which drop it as they go.
 */
export const useScoreboardSoFar = useScoreboard;
