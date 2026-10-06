"use client";

import type { ScoreboardState } from "@yogan-hockey/schemas";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Re-renders the page's server components when the Scoreboard says cached data was invalidated:
 * a game went final, or a catch-up recorded games nobody saw end. Call it from the one client
 * component that holds the Scoreboard socket, with `invalidatedAt` from the state it keeps
 * (first paint's value, then each update's). The value the page was rendered with refreshes
 * nothing; each change after that refreshes once.
 */
export function useRefreshOnInvalidation(invalidatedAt: ScoreboardState["invalidatedAt"]): void {
  const router = useRouter();
  const seen = useRef(invalidatedAt);
  useEffect(() => {
    if (seen.current === invalidatedAt) return;
    seen.current = invalidatedAt;
    router.refresh();
  }, [invalidatedAt, router]);
}
