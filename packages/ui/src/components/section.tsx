import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

/** One subject on a page: a `SectionHeader` and, usually, one `Ledger`. */
function Section({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="section"
      className={cn("min-w-0 border border-rule bg-panel", className)}
      {...props}
    />
  );
}

/**
 * The line above a ledger: the subject in bold capitals, then a count or a view in quiet text
 * ("TONIGHT 6 games, 2 live", "STANDINGS league"). Children sit at the right end of the line.
 */
function SectionHeader({
  className,
  title,
  count,
  children,
  ...props
}: Omit<ComponentProps<"div">, "title"> & { title: ReactNode; count?: ReactNode }) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "section-header flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-rule border-b px-3 py-2.5 sm:min-h-12 sm:px-4",
        className,
      )}
      {...props}
    >
      <h2 className="font-semibold text-sm tracking-tight">
        {title}
        {count != null && (
          <span className="ml-1 font-normal text-muted-foreground normal-case"> {count}</span>
        )}
      </h2>
      {children != null && <div className="text-xs text-muted-foreground">{children}</div>}
    </div>
  );
}

export { Section, SectionHeader };
