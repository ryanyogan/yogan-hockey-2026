import { cva } from "class-variance-authority";
import type { ElementType, ReactNode } from "react";
import { cn } from "../cn";
import { focusRingInside } from "./nav-item";

/**
 * A set of tabs is the prototype's Eastern/Western control (`.conf-tabs`): one box ruled in ink,
 * its cells 44px tall, 13px semibold capitals, each ruled off from the one before, and the
 * current cell filled with ink. On a phone the cells share the screen's width equally, as the
 * prototype's two do, and a set too long for it scrolls sideways inside its own box (a cell is
 * never narrower than its words); at a desk the box is as wide as its words.
 *
 * Exported for a set of choices that is not links (the game page's radios) and looks the same:
 * `tabStrip` on what holds them and `tabCellVariants({ current })` on each. The first cell is
 * the first of its element, not the first child: a fieldset's first child is its legend.
 */
const tabStrip =
  "flex w-fit max-w-full overflow-x-auto border border-rule [scrollbar-width:none] max-md:w-full";
const tabCell = `flex min-h-11 flex-auto max-md:flex-1 cursor-pointer items-center justify-center whitespace-nowrap border-rule border-l px-4 font-label text-small uppercase leading-none tracking-mark first-of-type:border-l-0 ${focusRingInside}`;

/** Beside `tabCellVariants` on a label that holds a radio: the ring is the label's. */
const tabCellHoldsFocus =
  "has-focus-visible:outline-2 has-focus-visible:outline-kicker has-focus-visible:-outline-offset-2 has-focus-visible:outline-solid";

const tabCellVariants = cva(tabCell, {
  variants: {
    current: {
      true: "bg-foreground text-background",
      false: "hover:bg-highlight",
    },
  },
  defaultVariants: { current: false },
});

type UrlTab = { value: string; label: ReactNode; href: string };

/**
 * Tabs held in the URL: each tab is a link, so the choice survives a reload and can be shared.
 * The page reads the choice from its address and passes it back as `current`.
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
  /** The app's link component (`apps/web/components/link.tsx`), so a tab changes without a full page load. */
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
          className={tabCellVariants({ current: tab.value === current })}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export { tabCellHoldsFocus, tabCellVariants, tabStrip, type UrlTab, UrlTabs };
