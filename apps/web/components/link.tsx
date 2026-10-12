import { type LinkProps as RouterLinkProps, useLinkProps } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type LinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

/**
 * The site's link: every link to a page of the site is this, given the address as a string.
 *
 * A page of the site is the router's to open: its loader's data is read when the visitor shows
 * they mean to go there (the pointer resting on the link, the keyboard's focus arriving, a finger
 * going down), which is the router's own preloading (`src/router.tsx`), and the page left stays
 * on screen until the next is ready. Any other address is a plain anchor.
 */
export function Link({ href, ...props }: LinkProps) {
  return isInternalHref(href) ? <PageLink href={href} {...props} /> : <a href={href} {...props} />;
}

function PageLink({ href, ...props }: LinkProps) {
  const { pathname, searchParams, hash } = new URL(href, "http://site");
  const {
    // The router marks a link to the page that is open in three ways of its own. The site's
    // markup is the site's: what is current is said by whoever draws the link (`aria-current`
    // on a section or a tab), in the class it was given.
    "data-status": _status,
    "aria-current": _current,
    className: _className,
    ...anchor
  }: ComponentProps<"a"> & { "data-status"?: string } = useLinkProps({
    ...props,
    // The addresses are the site's own strings (`nhlHref`, `teamPageHref`), not the route
    // tree's typed ones, so the router is told the path and the query apart.
    to: pathname,
    search: Object.fromEntries(searchParams),
    hash: hash.slice(1) || undefined,
  } as RouterLinkProps as Parameters<typeof useLinkProps>[0]);
  return <a {...anchor} aria-current={props["aria-current"]} className={props.className} />;
}

/** Whether an href is a page of this site, which is all the router can open. */
export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}
