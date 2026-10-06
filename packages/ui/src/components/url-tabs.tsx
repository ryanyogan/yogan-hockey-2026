import { cn } from "cn";
import type { ElementType, ReactNode } from "react";
import { navItemVariants } from "./nav-item";

type UrlTab = { value: string; label: ReactNode; href: string };

/**
 * Tabs held in the URL: each tab is a link, so the choice survives a reload and can be shared.
 * The page reads the choice from `searchParams` and passes it back as `current`.
 *
 *   <UrlTabs label="Team" link={Link} current={tab} tabs={[
 *     { value: "schedule", label: "schedule", href: "?tab=schedule" },
 *     { value: "roster", label: "roster", href: "?tab=roster" },
 *   ]} />
 */
function UrlTabs({
  label,
  tabs,
  current,
  link: Link = "a",
  className,
}: {
  /** Names the set of tabs for a screen reader. */
  label: string;
  tabs: readonly UrlTab[];
  current: string;
  /** The app's link component (`next/link`), so a tab changes without a full page load. */
  link?: ElementType;
  className?: string;
}) {
  return (
    <nav data-slot="url-tabs" aria-label={label} className={cn("flex flex-wrap gap-1", className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          aria-current={tab.value === current ? "page" : undefined}
          className={navItemVariants({ current: tab.value === current })}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export { type UrlTab, UrlTabs };
