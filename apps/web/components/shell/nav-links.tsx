"use client";

import { navItemVariants } from "@yogan-hockey/ui/components/nav-item";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { currentNavItem, NAV_ITEMS } from "../../lib/nav";

type NavLinksProps = {
  /** `touch` gives each link a row tall enough for a thumb. */
  size?: "default" | "touch";
  /** Called when a link is followed, so the phone menu can close. */
  onNavigate?: () => void;
};

/** The site's places as links, the current one marked. A client component only to know the path. */
export function NavLinks({ size = "default", onNavigate }: NavLinksProps) {
  const current = currentNavItem(usePathname(), useSearchParams().get("tab"));
  return NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={item === current ? "page" : undefined}
      className={navItemVariants({ current: item === current, size })}
      onClick={onNavigate}
    >
      {item.label}
    </Link>
  ));
}
