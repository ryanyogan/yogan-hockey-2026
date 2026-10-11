import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps } from "react";

/** A small label in the ledger's language: square, capitals, the size of a column header. */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 border border-transparent px-1.5 py-px text-[10px] uppercase tracking-wider whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-rule text-foreground/70",
        live: "bg-live-tint text-live",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
