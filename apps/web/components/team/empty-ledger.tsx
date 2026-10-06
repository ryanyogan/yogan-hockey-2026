import type { ComponentProps, ReactNode } from "react";

/** The line drawn where a ledger would be, when there is nothing yet to put in it. */
export function EmptyLedger({
  children,
  ...props
}: { children: ReactNode } & Pick<ComponentProps<"p">, "role">) {
  return (
    <p className="border-foreground/20 border-t px-2 py-1.5 text-foreground/70" {...props}>
      {children}
    </p>
  );
}
