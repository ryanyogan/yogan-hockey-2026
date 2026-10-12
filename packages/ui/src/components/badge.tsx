import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";
import { mark } from "./marker";

/**
 * A badge is a mark (`.mark` in the prototype): filled with ink for the positive state (a pick
 * that was right, a socket that is open), outlined for the other, and the one red for anything
 * live.
 */
const badgeVariants = cva(mark, {
  variants: {
    variant: {
      default: "border-rule bg-foreground text-background",
      /** Outlined, on the tint of a row under the pointer: a state that is neither. */
      secondary: "border-rule bg-highlight",
      outline: "border-rule",
      live: "border-kicker text-kicker",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
