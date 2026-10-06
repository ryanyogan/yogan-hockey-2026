"use client";

import type { ScoreboardState } from "@yogan-hockey/schemas";
import { useAgent } from "agents/react";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useRef, useState } from "react";
import { SCOREBOARD_CONNECTION } from "../../lib/scoreboard-connection";
import { newFinals } from "../../lib/scoreboard-view";

const ScoreboardContext = createContext<ScoreboardState | null>(null);

/**
 * The page's one socket to the Scoreboard Agent. The root layout renders it around every page with
 * the games read for first paint; from then on the Agent pushes each change. Anything that shows
 * today's games reads them with `useScoreboard()` and opens no socket of its own.
 *
 * When a game goes final, what the server rendered about it (standings, a team's record, the
 * Replay) is out of date, so the page's server components are rendered again.
 */
export function ScoreboardProvider({
  initial,
  children,
}: {
  initial: ScoreboardState;
  children: ReactNode;
}) {
  const [scoreboard, setScoreboard] = useState(initial);
  const router = useRouter();
  // What the last comparison was made against, kept outside render so no push is compared twice.
  const seen = useRef(initial);

  useAgent<ScoreboardState>({
    ...SCOREBOARD_CONNECTION,
    onStateUpdate: (next) => {
      const finals = newFinals(seen.current, next);
      seen.current = next;
      setScoreboard(next);
      if (finals.length > 0) router.refresh();
    },
  });

  return <ScoreboardContext value={scoreboard}>{children}</ScoreboardContext>;
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
  return <ScoreboardContext value={scoreboard}>{children}</ScoreboardContext>;
}

/**
 * Today's games, current without a refresh: `{ date, games, updatedAt }`. Call it in any client
 * component; `lib/scoreboard-view.ts` has the status line, the sections and the ticker's order.
 */
export function useScoreboard(): ScoreboardState {
  const scoreboard = useContext(ScoreboardContext);
  if (scoreboard == null) throw new Error("useScoreboard needs the layout's ScoreboardProvider");
  return scoreboard;
}
