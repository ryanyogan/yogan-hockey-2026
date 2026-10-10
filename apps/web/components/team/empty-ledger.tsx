import type { ComponentProps, ReactNode } from "react";

/** The line drawn where a ledger would be, when there is nothing yet to put in it. */
export function EmptyLedger({
  children,
  ...props
}: { children: ReactNode } & Pick<ComponentProps<"p">, "role">) {
  return (
    <p className="px-3 py-4 text-muted-foreground sm:px-4" {...props}>
      {children}
    </p>
  );
}
