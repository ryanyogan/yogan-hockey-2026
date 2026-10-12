import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../cn";
import { focusRing } from "./nav-item";

/**
 * A button as the prototype draws its Day and Night: 12px semibold capitals, square, 44px tall,
 * filled with ink or ruled in it. No radius, no shadow, and no fill but ink and the tint of a
 * row under the pointer. The `inline` size is the exception: it is words in a sentence, and is
 * set as the sentence is.
 */
const boxed = "font-label text-tag uppercase leading-none tracking-mark";

const buttonVariants = cva(
  `inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap border border-transparent ${focusRing} disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0`,
  {
    variants: {
      variant: {
        default: "border-rule bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "border-rule hover:bg-highlight",
        /** Reads as text until hovered. */
        ghost: "text-note hover:text-foreground",
      },
      size: {
        default: `min-h-11 px-3 ${boxed}`,
        /** Shorter at a desk, beside a line of text; a thumb tall on a phone all the same. */
        sm: `min-h-8 px-2 max-md:min-h-11 max-md:px-3 ${boxed}`,
        /** No box of its own: sits on a line of text, and a thumb reaches it on a phone. */
        inline: "tap-target min-h-6 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
