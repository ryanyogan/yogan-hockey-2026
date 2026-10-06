"use client";

import { useSyncExternalStore } from "react";
import { gameDay, gameTime, NHL_TIME_ZONE } from "../lib/game-time";

const FORMATS = { day: gameDay, time: gameTime };

// The visitor's time zone does not change under an open page: there is nothing to subscribe to.
const never = () => () => {};

/**
 * When a game starts, in the visitor's time zone: its day ("Tue Oct 6") or its time ("7:00 PM").
 * The server knows only Eastern time and writes that, the time marked "ET"; the browser puts the
 * visitor's own in as the page hydrates, without a mismatch.
 */
export function LocalTime({ startTime, show }: { startTime: string; show: keyof typeof FORMATS }) {
  const format = FORMATS[show];
  const text = useSyncExternalStore(
    never,
    () => format(startTime),
    () => `${format(startTime, NHL_TIME_ZONE)}${show === "time" ? " ET" : ""}`,
  );
  return <time dateTime={startTime}>{text}</time>;
}
