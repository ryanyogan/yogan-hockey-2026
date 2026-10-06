"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { refreshDue } from "./invalidation";

/**
 * Re-renders the page's server components when the Scoreboard says cached data was invalidated:
 * a game went final, or a catch-up recorded games nobody saw end. Call it from the one client
 * component that holds the Scoreboard socket, with `invalidatedAt` as the server rendered the
 * page with and as the socket's latest state has it, each `undefined` until it is known. The rule
 * is `refreshDue` (`lib/invalidation.ts`): the render's own value refreshes nothing, and each
 * later one refreshes once.
 *
 * `router.refresh()` also empties the router's caches, so a page prefetched or visited before
 * the invalidation is not drawn again from memory.
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
    router.refresh();
  }, [rendered, heard, router]);
}
