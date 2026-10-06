/** The line drawn where a ledger would be, when there is nothing yet to put in it. */
export function EmptyLedger({ children }: { children: string }) {
  return <p className="border-foreground/20 border-t px-2 py-1.5 text-foreground/70">{children}</p>;
}
