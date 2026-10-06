"use client";

import type { ScoreboardReading, ScoreboardState } from "@yogan-hockey/schemas";
import { useAgent } from "agents/react";
import {
  createContext,
  type ReactNode,
  Suspense,
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
  | { reading: null; initial: Promise<ScoreboardReading> | null };

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
 * `initial` is null on a page served from the page cache (`lib/page-cache.ts`), whose HTML holds
 * nothing that changes by the minute: the games are the socket's alone, a `ScoreboardGate` holds
 * the place of whatever shows them until it has spoken, and the page counts as rendered with the
 * first `invalidatedAt` the socket reports (the cache's key answers for anything earlier).
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
  initial: Promise<ScoreboardReading> | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<ScoreboardState | null>(null);
  // `invalidatedAt` as the socket first had it; undefined until it has spoken.
  const [firstHeard, setFirstHeard] = useState<string | null | undefined>(undefined);
  // What the server rendered this page with, once it has streamed in. A navigation or a refresh
  // renders the layout again and brings a newer one.
  const [rendered, setRendered] = useState<ScoreboardReading | null>(null);
  const [lastHeardAt, setLastHeardAt] = useState<string | null>(null);
  const drop = useDropWatch();

  useEffect(() => {
    if (initial == null) return;
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
    onStateUpdate: (next) => {
      setState(next);
      setFirstHeard((first) => (first === undefined ? (next.invalidatedAt ?? null) : first));
    },
    onMessage: (message) => {
      const at = heardAtFrom(message.data);
      if (at != null) setLastHeardAt((heardAt) => laterOf(heardAt, at));
    },
  });
  useRefreshOnInvalidation(
    initial == null ? firstHeard : rendered == null ? undefined : (rendered.invalidatedAt ?? null),
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

/** What a page shows of today's games before anything is known: none. */
const NO_READING: ScoreboardReading = {
  date: null,
  games: [],
  updatedAt: null,
  invalidatedAt: null,
  heardAt: null,
};

/**
 * Holds the place of whatever calls `useScoreboard()` until there are games to give it:
 * `fallback`, which is the size of what replaces it, stands while the layout's first paint is
 * still streaming in and, on a page served from the page cache, until the socket has spoken.
 * The server and the browser's first render agree (both draw `fallback` on a cached page), so
 * nothing is thrown away at hydration.
 */
export function ScoreboardGate({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  const source = useContext(ScoreboardContext);
  if (source != null && source.reading == null && source.initial == null) return fallback;
  return <Suspense fallback={fallback}>{children}</Suspense>;
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
 * is still on its way: render the caller inside a `ScoreboardGate` with a fallback of its own
 * size (a `<Suspense>` will do on a page that is never served from the page cache). Outside a
 * gate on a cached page it answers no games until the socket has spoken.
 */
export function useScoreboard(): ScoreboardReading {
  const source = useContext(ScoreboardContext);
  if (source == null) throw new Error("useScoreboard needs the layout's ScoreboardProvider");
  if (source.reading != null) return source.reading;
  return source.initial == null ? NO_READING : use(source.initial);
}
