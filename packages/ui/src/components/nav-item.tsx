import { cva } from "class-variance-authority";

/**
 * One choice in a set of page tabs. The current one is a solid block, the
 * rest are quiet text. Put it on a link: `className={navItemVariants({ current })}`.
 */
const navItemVariants = cva(
  "flex min-h-11 items-center justify-center px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      current: {
        true: "bg-primary text-primary-foreground",
        false: "text-muted-foreground hover:bg-muted hover:text-foreground",
      },
      size: {
        default: "py-0.5",
        /** Additional vertical padding for a touch control. */
        touch: "py-2.5",
      },
    },
    defaultVariants: { current: false, size: "default" },
  },
);

export { navItemVariants };
