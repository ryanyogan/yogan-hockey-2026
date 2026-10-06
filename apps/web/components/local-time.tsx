"use client";

import { useSyncExternalStore } from "react";
import { clockTime, gameDay, gameTime, NHL_TIME_ZONE } from "../lib/game-time";

const FORMATS = { day: gameDay, time: gameTime, clock: clockTime };
/** What the server's Eastern time is marked with. A day needs no mark. */
const EASTERN_MARK = { day: "", time: " ET", clock: " ET" };

// The visitor's time zone does not change under an open page: there is nothing to subscribe to.
const never = () => () => {};

/**
 * A moment in the visitor's time zone: the day a game starts ("Tue Oct 6"), the time it starts
 * ("7:00 PM"), or a time to the second ("20:14:07", the "updated" stamp). The server knows only
 * Eastern time and writes that, a time marked "ET"; the browser puts the visitor's own in as the
 * page hydrates, without a mismatch. Every time on the site is shown through this.
 */
export function LocalTime({ at, show }: { at: string; show: keyof typeof FORMATS }) {
  const format = FORMATS[show];
  const text = useSyncExternalStore(
    never,
    () => format(at),
    () => `${format(at, NHL_TIME_ZONE)}${EASTERN_MARK[show]}`,
  );
  return <time dateTime={at}>{text}</time>;
}
