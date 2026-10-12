import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { refreshDue } from "./invalidation";

/**
 * Runs the router's loaders again when the Scoreboard says cached data was forgotten: a game went
 * final, or a catch-up recorded games nobody saw end. Call it from the one component that holds
 * the Scoreboard socket, with `invalidatedAt` as the loaders read it and as the socket's latest
 * state has it, the socket's `undefined` until it has spoken. The rule is `refreshDue`
 * (`lib/invalidation.ts`): the loaders' own value refreshes nothing, and each later one refreshes
 * once.
 *
 * `router.invalidate()` reads the drawn page's loaders again, the root route's with them, and
 * marks everything else the router holds as stale, so a page preloaded or visited before the
 * final is read again when it is next opened.
 */
export function useRefreshOnInvalidation(
  rendered: string | null | undefined,
  heard: string | null | undefined,
): void {
  const router = useRouter();
  const refreshedFor = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!refreshDue({ rendered, heard, refreshedFor: refreshedFor.current })) return;
    refreshedFor.current = heard;
    void router.invalidate();
  }, [rendered, heard, router]);
}
