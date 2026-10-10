import { cn } from "cn";
import type { ComponentProps } from "react";

/**
 * A heart that is pressed or not: the mark that makes a player or a team a favorite. It holds no
 * state; give it `pressed`, an `onClick` and a `label` that names what it marks ("Favorite Auston
 * Matthews"), which stays the same either way since `aria-pressed` says which.
 *
 * The heart is drawn, not typed (Geist Mono has no "♥"), one em square, so it sits in a line of
 * text without making the line taller. What takes the tap is wider than what is drawn: 37px by
 * 27px around a 13px heart, inside the row and no further. `relative z-10` puts it above a
 * ledger row's stretched link.
 */
function HeartButton({
  className,
  pressed,
  label,
  ...props
}: Omit<ComponentProps<"button">, "children" | "aria-label" | "aria-pressed"> & {
  pressed: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      data-slot="heart-button"
      aria-pressed={pressed}
      aria-label={label}
      className={cn(
        "relative z-10 inline-flex size-[1em] cursor-pointer align-[-0.125em] outline-none",
        // No further right than a ledger cell's padding, or the ledger would scroll sideways.
        "after:absolute after:-inset-y-[7px] after:-right-2 after:-left-4 after:content-['']",
        "focus-visible:outline-1 focus-visible:outline-solidfocus-visible:outline-foreground focus-visible:outline-offset-4",
        pressed ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="size-full"
        fill={pressed ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="miter"
      >
        {/* Straight edges and square corners, as everything else on the page has. */}
        <path d="M6 10.6 1.1 6.1V3.2L3.2 1.4h1.6L6 2.9 7.2 1.4h1.6l2.1 1.8v2.9z" />
      </svg>
    </button>
  );
}

export { HeartButton };
