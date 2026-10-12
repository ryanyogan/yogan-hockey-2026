import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

/** One subject on a page: a `SectionHeader` and, usually, one `Ledger`. */
function Section({ className, ...props }: ComponentProps<"section">) {
  return <section data-slot="section" className={className} {...props} />;
}

/**
 * The red label (`.label` in the prototype): the one red's 12px bold capitals. A `SectionHeader`
 * is this over a rule; a heading that is the whole of its line, or one of another level, takes
 * the classes: `sectionLabel`, and `sectionRule` for the plain ink rule under it.
 */
const sectionLabel = "font-strong text-kicker text-tag uppercase tracking-label";
const sectionRule = "border-rule border-b pb-1.5";

/**
 * The label above a ledger: the subject in the one red's bold capitals over a plain ink rule,
 * then a count or a view in quiet text ("TONIGHT 6 games, 2 live", "STANDINGS league"). Children
 * sit at the right end of the line, set as the prototype's "more" links are.
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
        "flex flex-wrap items-baseline justify-between gap-x-4",
        sectionRule,
        className,
      )}
      {...props}
    >
      <h2 className={sectionLabel}>
        {title}
        {count != null && (
          <>
            {" "}
            <span
              data-slot="section-count"
              className="font-quiet text-label text-small normal-case tracking-normal"
            >
              {count}
            </span>
          </>
        )}
      </h2>
      {children != null && (
        <div
          data-slot="section-aside"
          className="flex flex-wrap gap-x-4 font-label text-small uppercase tracking-head"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * A page's title: a heavy ink rule and, under it, a serif section title, the page's first heading
 * ("Standings", a team's name), as the prototype's lower band opens with its rule above
 * "Standings" (`.lower`, `.band-head`, `.band-title`). A count sits beside the title in quiet
 * agate, and children at the right end of the line, as in a `SectionHeader`.
 *
 *   <PageHeader title="Standings" count="league">
 *     <Link href="/nhl?tab=teams">Teams</Link>
 *   </PageHeader>
 */
function PageHeader({
  className,
  title,
  count,
  children,
  ...props
}: Omit<ComponentProps<"header">, "title"> & { title: ReactNode; count?: ReactNode }) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-4 border-rule border-t-3 pt-3 md:pt-4 md:pb-3.5",
        className,
      )}
      {...props}
    >
      <h1 className="font-serif font-strong text-title tracking-[-0.01em]">
        {title}
        {count != null && (
          <>
            {" "}
            <span
              data-slot="page-count"
              className="font-agate font-quiet text-label text-small tracking-normal"
            >
              {count}
            </span>
          </>
        )}
      </h1>
      {children != null && (
        <div
          data-slot="page-aside"
          className="flex flex-wrap gap-x-4 font-label text-small uppercase tracking-head"
        >
          {children}
        </div>
      )}
    </header>
  );
}

export { PageHeader, Section, SectionHeader, sectionLabel, sectionRule };
