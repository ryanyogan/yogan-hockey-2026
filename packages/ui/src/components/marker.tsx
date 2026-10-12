import type { ComponentProps } from "react";
import { cn } from "../cn";

/**
 * A mark (`.mark` in the prototype): 12px bold capitals in a 1px box, which takes its colour
 * from the ink unless it is told another. A `Badge` and a `FavoriteMarker` are both marks.
 */
const mark =
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap border px-1.5 py-[3px] font-strong text-tag uppercase leading-none tracking-mark";

/**
 * "● live": a game in progress, in the one red, as the prototype's kicker and its briefs say it.
 * It is set in the size of the line it is on. Give it children to say more ("2nd 12:34"), and
 * `strong` where it is the row's status rather than a note beside it.
 */
function LiveMarker({
  className,
  strong = false,
  children,
  ...props
}: ComponentProps<"span"> & { strong?: boolean }) {
  return (
    <span
      data-slot="live-marker"
      className={cn(
        "whitespace-nowrap text-live",
        strong ? "font-strong" : "font-label",
        className,
      )}
      {...props}
    >
      {/*
       * Drawn, not typed: IBM Plex Sans Condensed has no "●" (nor "♥" or "★"), so each device's
       * fallback font would draw its own size. 8px, and it pulses unless motion is reduced.
       */}
      <span
        aria-hidden="true"
        className="mr-1.5 inline-block size-2 rounded-full bg-live align-[1px] motion-safe:animate-live"
      />
      {/* The dot says "live" to the eye only, so the word is always there to be read out. */}
      {children == null ? "live" : <span className="sr-only">live, </span>}
      {children}
    </span>
  );
}

/**
 * "★ favorite team": a mark on a row that is one of the visitor's favorites. Give it children
 * that only a screen reader is given and the mark is the star alone.
 */
function FavoriteMarker({ className, children = "favorite", ...props }: ComponentProps<"span">) {
  return (
    <span data-slot="favorite-marker" className={cn(mark, "border-rule", className)} {...props}>
      {/* Drawn, not typed, as the live dot is: the face has no "★". */}
      <svg viewBox="0 0 12 12" aria-hidden="true" className="size-[0.85em]" fill="currentColor">
        <path d="M6 .6 7.6 4.3l4 .4-3 2.7.9 4L6 9.3l-3.5 2.1.9-4-3-2.7 4-.4z" />
      </svg>
      {children}
    </span>
  );
}

export { FavoriteMarker, LiveMarker, mark };
