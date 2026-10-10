"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { currentNavItem, NAV_ITEMS } from "../../lib/nav";
import { Link } from "../link";

/** Only the active marker follows the path; the enclosing server shell persists. */
export function NavLinks() {
  const current = currentNavItem(usePathname(), useSearchParams().get("tab"));
  return NAV_ITEMS.map((item) => (
    <Link key={item.href} href={item.href} aria-current={item === current ? "page" : undefined}>
      {item.label}
    </Link>
  ));
}
