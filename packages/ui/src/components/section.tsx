import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

/** One subject on a page: a `SectionHeader` and, usually, one `Ledger`. */
function Section({ className, ...props }: ComponentProps<"section">) {
  return <section data-slot="section" className={className} {...props} />;
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
      className={cn("mb-1 flex flex-wrap items-baseline justify-between gap-x-4", className)}
      {...props}
    >
      <h2 className="font-bold uppercase">
        {title}
        {count != null && (
          <span className="font-normal text-foreground/50 normal-case"> {count}</span>
        )}
      </h2>
      {children != null && <div className="text-foreground/50">{children}</div>}
    </div>
  );
}

export { Section, SectionHeader };
