"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { isInternalHref, linkIntent } from "../lib/link-intent";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href" | "prefetch"> & { href: string };

// One for the whole page: resting on a second link gives up the wait on the first.
let prefetchPage: (href: string) => void = () => {};
const intent = linkIntent((href) => prefetchPage(href));

/**
 * The site's link: every link to a page of the site is this, never a bare `next/link`.
 *
 * It prefetches the page it leads to when the visitor shows they mean to go there: the pointer
 * resting on it, the keyboard's focus arriving, or a finger or button going down. The click that
 * follows then draws the page from the router's cache, with no request of its own.
 *
 * It never prefetches because it is on screen, which `next/link` does by default: a list of
 * thirty rows would render thirty pages on the server for a visitor who opens one (#44, #94).
 *
 * The whole page is prefetched (`kind: "full"`), not its loading shell, so what the click shows
 * is the content. The router keeps it for five minutes, and `router.refresh()`, which the shell
 * calls when the Scoreboard invalidates something, throws it away.
 */
export function Link({
  href,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  ...props
}: LinkProps) {
  const router = useRouter();
  const internal = isInternalHref(href);
  const meaning = (act: () => void) => {
    if (!internal) return;
    prefetchPage = (page) => router.prefetch(page, { kind: FULL });
    act();
  };
  return (
    <NextLink
      href={href}
      // Off: no prefetch for being on screen. Ours is by intent, below.
      prefetch={false}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        // A finger has no hover: its "enter" comes with the press, which is handled there.
        if (event.pointerType === "mouse") meaning(() => intent.rest(href));
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        intent.leave();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        meaning(() => intent.press(href));
      }}
      onFocus={(event) => {
        onFocus?.(event);
        meaning(() => intent.rest(href));
      }}
      onBlur={(event) => {
        onBlur?.(event);
        intent.leave();
      }}
      {...props}
    />
  );
}

/** The whole page, not its loading shell: `PrefetchKind.FULL`, which `next` does not export. */
const FULL = "full" as Parameters<ReturnType<typeof useRouter>["prefetch"]>[1] extends
  | { kind: infer Kind }
  | undefined
  ? Kind
  : never;
