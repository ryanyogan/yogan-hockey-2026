import type { ComponentProps, ReactNode } from "react";

/**
 * The line drawn where a ledger would be, when there is nothing yet to put in it: a sentence of
 * serif prose under the section's own rule, starting on the label's line.
 */
export function EmptyLedger({
  children,
  ...props
}: { children: ReactNode } & Pick<ComponentProps<"p">, "role">) {
  return (
    <p className="py-2 font-serif text-note text-prose" {...props}>
      {children}
    </p>
  );
}
