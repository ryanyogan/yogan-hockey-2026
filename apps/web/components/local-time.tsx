"use client";

import { useSyncExternalStore } from "react";
import { easternTime, TIME_FORMATS } from "../lib/game-time";

// The visitor's time zone does not change under an open page: there is nothing to subscribe to.
const never = () => () => {};

/**
 * A moment in the visitor's time zone: the day a game starts ("Tue Oct 6"), the time it starts
 * ("7:00 PM"), or a time to the second ("20:14:07", the "updated" stamp). The server knows only
 * Eastern time and writes that, a time marked "ET"; the browser puts the visitor's own in as the
 * page hydrates, without a mismatch. Every time on the site is shown through this.
 *
 * A time or a clock keeps the room the server's form took, so nothing beside it moves when the
 * shorter one replaces it: a box as many characters wide (`ch` is one character in the site's
 * monospace), its text aligned as its surroundings are. The text is keyed, so the browser's is a
 * new element and not the old one moved, which in a right-aligned column would itself be a shift.
 * A day is left as text: it differs between zones only for a game around midnight.
 */
export function LocalTime({ at, show }: { at: string; show: keyof typeof TIME_FORMATS }) {
  const eastern = easternTime(at, show);
  const text = useSyncExternalStore(
    never,
    () => TIME_FORMATS[show](at),
    () => eastern,
  );
  if (show === "day") return <time dateTime={at}>{text}</time>;
  return (
    <time dateTime={at} className="inline-block" style={{ minWidth: `${eastern.length}ch` }}>
      <span key={text}>{text}</span>
    </time>
  );
}
