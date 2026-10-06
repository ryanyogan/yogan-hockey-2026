import { cva } from "class-variance-authority";

/**
 * One choice in a list of places: a sidebar link or a tab. The current one is a solid block, the
 * rest are quiet text. Put it on a link: `className={navItemVariants({ current })}`.
 */
const navItemVariants = cva(
  "block px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      current: {
        true: "bg-primary text-primary-foreground",
        false: "text-foreground/60 hover:text-foreground",
      },
      size: {
        default: "py-0.5",
        /** A row tall enough for a thumb, for the phone menu. */
        touch: "py-2.5",
      },
    },
    defaultVariants: { current: false, size: "default" },
  },
);

export { navItemVariants };
