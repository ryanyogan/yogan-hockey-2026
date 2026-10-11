"use client";

import { navItemVariants, tabBarItemVariants } from "@yogan-hockey/ui/components/nav-item";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { currentNavItem, NAV_ITEMS, type NavItem, navItemByPathAlone } from "../../lib/nav";
import { Link } from "../link";

const VARIANTS = { sidebar: navItemVariants, tabBar: tabBarItemVariants };

type Variant = keyof typeof VARIANTS;

function Links({ variant, current }: { variant: Variant; current: NavItem | undefined }) {
  return NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={item === current ? "page" : undefined}
      className={VARIANTS[variant]({ current: item === current })}
    >
      {item.label}
    </Link>
  ));
}

function LinksByQuery({ variant }: { variant: Variant }) {
  return (
    <Links
      variant={variant}
      current={currentNavItem(usePathname(), useSearchParams().get("tab"))}
    />
  );
}

function LinksByPath({ variant }: { variant: Variant }) {
  return <Links variant={variant} current={navItemByPathAlone(usePathname())} />;
}

/**
 * The site's places as links, the current one marked: down the desktop sidebar, or across the
 * phone's tab bar. A client component only to know the address.
 *
 * Reading the query string suspends while the server renders, until it knows whether the page is
 * static, and what suspends is sent after the page. So the links are drawn at once from the path,
 * which settles the place everywhere but on `/nhl`, and again when the query is known.
 */
export function NavLinks({ variant = "sidebar" }: { variant?: Variant }) {
  return (
    <Suspense fallback={<LinksByPath variant={variant} />}>
      <LinksByQuery variant={variant} />
    </Suspense>
  );
}
