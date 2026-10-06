/**
 * When a link is worth prefetching: when the visitor shows they mean to follow it, and not
 * before. The site's `Link` (`components/link.tsx`) feeds this the pointer and gets told what to
 * prefetch.
 *
 * - `rest(href)`: the pointer, or the keyboard's focus, is on the link. It is prefetched if it is
 *   still there after `dwellMs`, so a pointer drawn down a list of thirty rows prefetches the one
 *   it stops on and none of the rows it crossed.
 * - `leave()`: the pointer has left before the wait was over.
 * - `press(href)`: a finger or a mouse button is down on the link. The click follows within a
 *   tenth of a second, so the prefetch starts now.
 *
 * It does not remember what it has prefetched: the router's prefetch cache does, and asking it
 * for a page it already holds costs nothing.
 */
export function linkIntent(prefetch: (href: string) => void, dwellMs = HOVER_DWELL_MS) {
  let waiting: { href: string; timer: ReturnType<typeof setTimeout> } | null = null;

  const leave = () => {
    if (waiting != null) clearTimeout(waiting.timer);
    waiting = null;
  };

  return {
    rest(href: string) {
      if (waiting?.href === href) return;
      leave();
      const timer = setTimeout(() => {
        waiting = null;
        prefetch(href);
      }, dwellMs);
      waiting = { href, timer };
    },
    leave,
    press(href: string) {
      leave();
      prefetch(href);
    },
  };
}

/**
 * How long the pointer rests on a link before it is prefetched. Long enough that crossing a link
 * on the way elsewhere costs nothing, short enough to be over well before a click: a visitor
 * takes a quarter of a second or more between reaching a link and pressing it.
 */
export const HOVER_DWELL_MS = 65;

/** Whether an href is a page of this site, which is all the router can prefetch. */
export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}
