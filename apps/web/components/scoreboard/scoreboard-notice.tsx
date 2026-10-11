"use client";

import { RECONNECTING } from "../../lib/connection-drop";
import { useScoreboardDropped } from "./scoreboard-provider";

/**
 * A line under the ticker while the page's Scoreboard socket is down: the scores on the page are
 * standing still and the page is trying to get them back. Nothing when the socket is up.
 */
export function ScoreboardNotice() {
  if (!useScoreboardDropped()) return null;
  return (
    <p
      role="status"
      data-slot="scoreboard-notice"
      className="border-rule border-t px-4 py-1 text-[10px] text-live leading-[15px] first:border-t-0 md:px-6"
    >
      {RECONNECTING} to live scores
    </p>
  );
}
