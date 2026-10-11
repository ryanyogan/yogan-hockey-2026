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
        true: "bg-primary font-label text-primary-foreground",
        false: "text-note hover:text-foreground",
      },
      size: {
        default: "py-1",
        /** A row tall enough for a thumb, for the phone menu: 44px. */
        touch: "py-row",
      },
    },
    defaultVariants: { current: false, size: "default" },
  },
);

export { navItemVariants };
