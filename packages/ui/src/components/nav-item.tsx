import { cva } from "class-variance-authority";

/**
 * The focus ring of every primitive: the prototype's 2px of the one red, 2px off the control.
 * A control inside a box that clips (a strip of tabs that scrolls) draws it inside itself
 * instead, with `-outline-offset-2` after this.
 */
const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-kicker focus-visible:outline-offset-2 focus-visible:outline-solid";

/**
 * One place in the section nav: 13px semibold capitals, 44px tall, and the one red when it is
 * the current place (`.sections a` in the prototype). Put it on a link:
 * `className={navItemVariants({ current })}`. A choice among views of one page is not a place:
 * that is a tab (`tabCellVariants` in `url-tabs`).
 */
const navItemVariants = cva(
  `inline-flex min-h-11 items-center font-label text-small uppercase leading-none tracking-head ${focusRing}`,
  {
    variants: {
      current: {
        true: "text-kicker",
        false: "hover:text-label",
      },
    },
    defaultVariants: { current: false },
  },
);

export { focusRing, navItemVariants };
