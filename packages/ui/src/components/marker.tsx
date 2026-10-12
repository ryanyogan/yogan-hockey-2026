import type { ComponentProps } from "react";
import { cn } from "../cn";

/**
 * A mark (`.mark` in the prototype): 12px bold capitals in a 1px box, which takes its colour
 * from the ink unless it is told another. A `Badge` and a `LiveMarker` are both marks.
 */
const mark =
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap border px-1.5 py-[3px] font-strong text-tag uppercase leading-none tracking-mark";

/**
 * The live dot (`.live-dot` in the prototype): 8px of the one red before the word it goes with,
 * pulsing unless motion is reduced. Drawn, not typed: IBM Plex Sans Condensed has no "●" (nor
 * "♥" or "★"), so each device's fallback font would draw its own size. It says "live" to the eye
 * only: give its element `aria-hidden` and say the word beside it.
 */
const liveDot =
  "mr-1.5 inline-block size-2 rounded-[50%] bg-live align-[1px] motion-safe:animate-live";

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
      <span aria-hidden="true" className={liveDot} />
      {/* The dot says "live" to the eye only, so the word is always there to be read out. */}
      {children == null ? "live" : <span className="sr-only">live, </span>}
      {children}
    </span>
  );
}

export { LiveMarker, liveDot, mark };
