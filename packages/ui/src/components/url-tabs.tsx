import type { ElementType, ReactNode } from "react";
import { cn } from "../cn";
import { navItemVariants } from "./nav-item";

/**
 * On a phone the tabs are one ruled strip of cells, each 44px tall and sharing the width; a set
 * too long for the screen scrolls sideways inside its own strip.
 *
 * Exported for a set of choices that is not links (the game page's radios) and looks the same:
 * `tabStrip` on what holds them, `tabCell` beside `navItemVariants` on each.
 */
const tabStrip =
  "flex flex-wrap max-md:w-full max-md:flex-nowrap max-md:overflow-x-auto max-md:border max-md:border-rule";
const tabCell =
  "max-md:flex max-md:min-h-11 max-md:flex-auto max-md:items-center max-md:justify-center max-md:whitespace-nowrap max-md:border-rule max-md:border-l max-md:py-0 max-md:text-[13px] max-md:first:border-l-0";

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
    <nav data-slot="url-tabs" aria-label={label} className={cn(tabStrip, className)}>
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          aria-current={tab.value === current ? "page" : undefined}
          className={cn(navItemVariants({ current: tab.value === current }), tabCell)}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export { tabCell, tabStrip, type UrlTab, UrlTabs };
