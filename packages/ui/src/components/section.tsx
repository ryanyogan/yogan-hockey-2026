import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

/** One subject on a page: a `SectionHeader` and, usually, one `Ledger`. */
function Section({ className, ...props }: ComponentProps<"section">) {
  return <section data-slot="section" className={className} {...props} />;
}

/**
 * The line above a ledger: the subject in bold capitals, then a count or a view in quiet text
 * ("TONIGHT 6 games, 2 live", "STANDINGS league"). Children sit at the right end of the line.
 *
 * `lead` is for the header that names what the whole page is about (a team): its title is drawn
 * in the score's size, on the same line height, so the header is no taller for it.
 */
function SectionHeader({
  className,
  title,
  count,
  lead = false,
  children,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  count?: ReactNode;
  lead?: boolean;
}) {
  return (
    <div
      data-slot="section-header"
      className={cn("mb-2 flex flex-wrap items-baseline justify-between gap-x-4", className)}
      {...props}
    >
      <h2 className={cn("font-strong uppercase", lead && "text-score")}>
        {title}
        {count != null && (
          <>
            {" "}
            <span data-slot="section-count" className="font-quiet text-body text-label normal-case">
              {count}
            </span>
          </>
        )}
      </h2>
      {children != null && (
        <div data-slot="section-aside" className="flex flex-wrap gap-x-4 text-label">
          {children}
        </div>
      )}
    </div>
  );
}

export { Section, SectionHeader };
