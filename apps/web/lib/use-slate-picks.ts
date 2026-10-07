"use client";

import { useEffect, useState } from "react";

const NONE: Readonly<Record<string, string>> = {};

/** `app/picks/route.ts`. What comes back is drawn as text, a line a game. */
async function slatePicks(): Promise<Record<string, string>> {
  const response = await fetch("/picks");
  if (!response.ok) throw new Error(`/picks answered ${response.status}`);
  return response.json();
}

/**
 * Today's slate's picks, each in one line by game id, read after first paint by a page the page
 * cache serves (spec section 2). Empty until they arrive and when they cannot be read; read again
 * when `invalidatedAt` moves, which is what the Scoreboard does when a pick is written.
 *
 * `wanted` false makes no request: a page that has nowhere to show a pick does not ask for one.
 */
export function useSlatePicks(
  wanted: boolean,
  invalidatedAt: string | null | undefined,
): Readonly<Record<string, string>> {
  const [picks, setPicks] = useState(NONE);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new `invalidatedAt` is the reason to read again.
  useEffect(() => {
    if (!wanted) return;
    let current = true;
    slatePicks().then(
      (read) => {
        if (current) setPicks(read);
      },
      // The picks are an extra: the page stands without them.
      () => {},
    );
    return () => {
      current = false;
    };
  }, [wanted, invalidatedAt]);
  return wanted ? picks : NONE;
}
