import type { ComponentProps, ReactNode } from "react";
import { emptyProse } from "../story/type";

/**
 * The line drawn where a ledger would be, when there is nothing yet to put in it: a sentence of
 * serif prose under the section's own rule, starting on the label's line.
 */
export function EmptyLedger({
  children,
  ...props
}: { children: ReactNode } & Pick<ComponentProps<"p">, "role">) {
  return (
    <p className={`py-2 ${emptyProse}`} {...props}>
      {children}
    </p>
  );
}
