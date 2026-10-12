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
      className="border-rule-head border-b py-1 text-[13px] text-live leading-[15px]"
    >
      {RECONNECTING} to live scores
    </p>
  );
}
