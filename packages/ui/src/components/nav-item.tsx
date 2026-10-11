import { cva } from "class-variance-authority";

/**
 * One choice in a list of places: a sidebar link or a tab. The current one is a solid block, the
 * rest are quiet text. Put it on a link: `className={navItemVariants({ current })}`.
 */
const navItemVariants = cva(
  "block px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      current: {
        true: "bg-primary font-label text-primary-foreground",
        false: "text-note hover:text-foreground",
      },
    },
    defaultVariants: { current: false },
  },
);

/**
 * One place in the phone's tab bar: a cell 56px tall, a fifth of the screen wide, ruled off from
 * the cell before it. Words only; the current one is the sidebar's solid block.
 */
const tabBarItemVariants = cva(
  "flex h-14 items-center justify-center border-rule border-l text-small outline-none first:border-l-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
  {
    variants: {
      current: {
        true: "bg-primary font-strong text-primary-foreground",
        false: "font-label text-note hover:text-foreground",
      },
    },
    defaultVariants: { current: false },
  },
);

export { navItemVariants, tabBarItemVariants };
