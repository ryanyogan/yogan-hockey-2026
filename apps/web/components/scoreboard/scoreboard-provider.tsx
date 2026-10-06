"use client";

import type { ScoreboardReading, ScoreboardState } from "@yogan-hockey/schemas";
import { useAgent } from "agents/react";
import {
  createContext,
  type ReactNode,
  use,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SCOREBOARD_CONNECTION } from "../../lib/scoreboard-connection";
import { heardAtFrom, laterOf } from "../../lib/scoreboard-view";
import { useDropWatch } from "../../lib/use-drop-watch";
import { useRefreshOnInvalidation } from "../../lib/use-refresh-on-invalidation";

/** What the provider knows: the socket's reading once it has one, first paint's until then. */
type ScoreboardSource =
  | { reading: ScoreboardReading }
  | { reading: null; initial: Promise<ScoreboardReading> };

const ScoreboardContext = createContext<ScoreboardSource | null>(null);
/** Whether the Scoreboard's socket has been down for longer than a blip. */
const ScoreboardDroppedContext = createContext(false);

/**
 * The page's one socket to the Scoreboard Agent. The root layout renders it around every page;
 * the Agent pushes each change. Anything that shows today's games reads them with
 * `useScoreboard()` and opens no socket of its own.
 *
 * `initial` is the layout's read of the Scoreboard for first paint, as a promise the layout does
 * not wait for: the shell is sent at once and the games stream in behind it. Whatever calls
 * `useScoreboard()` before the socket has spoken waits on that promise, so it belongs inside a
 * `<Suspense>` whose fallback is its own size (the ticker's is in `ScoreTickerSlot`).
 *
 * Two things arrive on the socket. The state, whenever a poll finds something different; and,
 * after a poll that finds nothing new, only the time ESPN was heard from, which is what keeps
 * `heardAt` moving on a quiet slate.
 *
 * When the Scoreboard has invalidated cached data (a game went final, or a catch-up recorded
 * games), what the server rendered is out of date: `invalidatedAt` moves past the one the page
 * was rendered with, and the page's server components are rendered again.
 *
 * While the socket is down the scores on the page stand still; `useScoreboardDropped()` says so
 * once that has lasted longer than a reconnect usually takes, and the shell tells the visitor.
 */
export function ScoreboardProvider({
  initial,
  children,
}: {
  initial: Promise<ScoreboardReading>;
  children: ReactNode;
}) {
  const [state, setState] = useState<ScoreboardState | null>(null);
  // What the server rendered this page with, once it has streamed in. A navigation or a refresh
  // renders the layout again and brings a newer one.
  const [rendered, setRendered] = useState<ScoreboardReading | null>(null);
  const [lastHeardAt, setLastHeardAt] = useState<string | null>(null);
  const drop = useDropWatch();

  useEffect(() => {
    let current = true;
    initial.then((reading) => {
      if (!current) return;
      setRendered(reading);
      setLastHeardAt((heardAt) => laterOf(heardAt, reading.heardAt));
    });
    return () => {
      current = false;
    };
  }, [initial]);

  useAgent<ScoreboardState>({
    ...SCOREBOARD_CONNECTION,
    onOpen: drop.opened,
    onClose: drop.closed,
    onStateUpdate: (next) => setState(next),
    onMessage: (message) => {
      const at = heardAtFrom(message.data);
      if (at != null) setLastHeardAt((heardAt) => laterOf(heardAt, at));
    },
  });
  useRefreshOnInvalidation(
    rendered == null ? undefined : (rendered.invalidatedAt ?? null),
    state == null ? undefined : (state.invalidatedAt ?? null),
  );

  const source = useMemo<ScoreboardSource>(
    () =>
      state == null
        ? { reading: null, initial }
        : // A state that arrives is itself news from ESPN, so the later of the two is the answer.
          { reading: { ...state, heardAt: laterOf(state.updatedAt, lastHeardAt) } },
    [state, lastHeardAt, initial],
  );
  return (
    <ScoreboardContext value={source}>
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
  const source = useMemo(
    () => ({ reading: { ...scoreboard, heardAt: scoreboard.updatedAt } }),
    [scoreboard],
  );
  return <ScoreboardContext value={source}>{children}</ScoreboardContext>;
}

/**
 * Today's games, current without a refresh: `{ date, games, heardAt }`, with the rest of the
 * Scoreboard's state. `heardAt` is when the Scoreboard last heard from ESPN and is what an
 * "updated" stamp shows; `updatedAt` is when the games last changed. Call it in any client
 * component; `lib/scoreboard-view.ts` has the status line, the sections and the ticker's order.
 *
 * Until the socket has spoken it answers with the layout's first paint, and suspends while that
 * is still on its way: render the caller inside a `<Suspense>` with a fallback of its own size.
 */
export function useScoreboard(): ScoreboardReading {
  const source = useContext(ScoreboardContext);
  if (source == null) throw new Error("useScoreboard needs the layout's ScoreboardProvider");
  return source.reading ?? use(source.initial);
}
