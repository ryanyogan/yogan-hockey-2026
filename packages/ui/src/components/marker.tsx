import { cn } from "cn";
import type { ComponentProps } from "react";

/**
 * "● live": a game in progress. Give it children to say more ("2nd 12:34"), and `strong` where it
 * is the row's status rather than a note beside it.
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
      className={cn("whitespace-nowrap text-live", strong && "font-bold", className)}
      {...props}
    >
      {/* Drawn, not typed: Geist Mono has no "●", and each fallback font draws its own size. */}
      <span
        aria-hidden="true"
        className="mr-[0.8em] inline-block size-[0.4em] rounded-full bg-current align-[0.2em]"
      />
      {/* The dot says "live" to the eye only, so the word is always there to be read out. */}
      {children == null ? "live" : <span className="sr-only">live, </span>}
      {children}
    </span>
  );
}

/** "★ favorite team": marks a row as one of the visitor's favorites. */
function FavoriteMarker({ className, children = "favorite", ...props }: ComponentProps<"span">) {
  return (
    <span data-slot="favorite-marker" className={className} {...props}>
      <span aria-hidden="true">★ </span>
      {children}
    </span>
  );
}

export { FavoriteMarker, LiveMarker };
