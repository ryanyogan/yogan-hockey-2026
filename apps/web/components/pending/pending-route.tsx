"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  type ReactNode,
  Suspense,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { type PendingOutline, pendingOutline } from "../../lib/pending-route";
import { OutlineOf } from "./outlines";

/**
 * The next page's outline at the tap, and the view transitions of a navigation (#127).
 *
 * `Link` calls `begin(href)` on a click. The outline for that address (`lib/pending-route.ts`)
 * is drawn at once in place of the page, which stays mounted and hidden: the router is still
 * waiting for the server's answer, and a page that was unmounted would lose its sockets and
 * state for a navigation that may yet fail. When the address changes the router has put the
 * next page in the hidden box, and the outline is swapped for it.
 *
 * Both swaps run inside `document.startViewTransition` where the browser has it and the visitor
 * has not asked for reduced motion; otherwise they are plain swaps. vinext 1.0.1 has no view
 * transitions of its own and replaces React's `<ViewTransition>` with a passthrough, so the
 * browser's API is called here directly.
 *
 * Runs in the browser because it holds what was tapped, which only the browser knows.
 */

/** `from` is the address tapped on, with its query; `to` the pathname the link leads to. */
type Pending = PendingOutline & { from: string; to: string };

const PendingContext = createContext<{
  pending: Pending | null;
  begin: (href: string) => void;
}>({ pending: null, begin: () => {} });

/** A navigation that has not arrived after this long is given up on: the old page is shown again. */
const GIVE_UP_MS = 10_000;

const here = () => window.location.pathname + window.location.search;

/**
 * Makes a change to what React draws inside a view transition, or plainly where there is to be
 * none. Only a transition needs the change drawn before its callback returns (`flushSync`): the
 * browser takes its picture of the new page then. A plain change is left to React, which may be
 * in the middle of a commit when an arrival is noticed.
 */
function transition(change: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof document.startViewTransition !== "function") {
    change();
    return;
  }
  document.startViewTransition(() => flushSync(change));
}

export function PendingRouteProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const shownPath = useRef(pathname);
  shownPath.current = pathname;
  const outlined = useRef(false);
  outlined.current = pending != null;
  // Counts the taps, so an outline whose drawing is still waiting on a view transition is not
  // drawn after a later tap has taken its place.
  const taps = useRef(0);

  const clear = useCallback(() => {
    if (giveUp.current != null) clearTimeout(giveUp.current);
    giveUp.current = null;
    if (outlined.current) transition(() => setPending(null));
  }, []);

  const begin = useCallback(
    (href: string) => {
      const tap = ++taps.current;
      const from = here();
      const outline = pendingOutline(from, href);
      if (outline == null) {
        // A second tap, on a link that gets no outline (back to the page tapped on, say): the
        // first tap's outline would stand for a page that is no longer on its way.
        clear();
        return;
      }
      if (giveUp.current != null) clearTimeout(giveUp.current);
      giveUp.current = setTimeout(clear, GIVE_UP_MS);
      const path = shownPath.current;
      transition(() => {
        // A view transition calls this a frame or more later: a page that was prefetched may
        // already be here, and an outline drawn now would have nothing to replace it. So would
        // one drawn after a second tap that asked for none: its give-up timer is already stopped.
        if (tap !== taps.current || here() !== from || shownPath.current !== path) return;
        setPending({ ...outline, from, to: href.split(/[?#]/)[0] ?? href });
        // A new page starts at its top, where the router will put it; a tab stays where it is.
        if (outline.scope === "page") window.scrollTo(0, 0);
      });
    },
    [clear],
  );

  const value = useMemo(() => ({ pending, begin }), [pending, begin]);
  return (
    <PendingContext value={value}>
      {/* Reading the query string suspends during a static render. */}
      <Suspense>
        <Arrival pending={pending} arrived={clear} />
      </Suspense>
      {children}
    </PendingContext>
  );
}

/**
 * Notices that the address has changed: the router has committed the next page, into the hidden
 * box. A layout effect, so the outline is still what the visitor sees when the swap begins.
 */
function Arrival({ pending, arrived }: { pending: Pending | null; arrived: () => void }) {
  // The router's own address, not `window.location`: vinext commits the page before it moves
  // the browser's address, so at this commit the location is still the page tapped on.
  const address = `${usePathname()}?${useSearchParams().toString()}`;
  const tappedOn = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (pending == null) tappedOn.current = null;
    else if (tappedOn.current == null) tappedOn.current = address;
    else if (tappedOn.current !== address) arrived();
  }, [pending, address, arrived]);
  return null;
}

/** What `Link` calls on a click that the router will take. */
export function useBeginNavigation(): (href: string) => void {
  return useContext(PendingContext).begin;
}

/**
 * The pathname to draw tabs for: where a tapped tab leads, from the tap on, and otherwise where
 * the page is. A tab that already holds what it shows (a game's) is so drawn at the tap; one
 * that waits for the server gets its outline from a `PendingOutlet`.
 */
export function useShownPathname(): string {
  const pathname = usePathname();
  const { pending } = useContext(PendingContext);
  return pending?.scope === "tab" ? pending.to : pathname;
}

/**
 * Where a page, or the part of one under its tabs, gives way to the next one's outline. The
 * shell has one around every page (`scope="page"`); a layout whose header outlives its tabs has
 * one around its tab (`scope="tab"`), so the header stays while a tab is on its way.
 */
export function PendingOutlet({
  scope,
  className,
  children,
}: {
  scope: "page" | "tab";
  /** The classes of the box the children are in: it is a real box, so it carries their spacing. */
  className?: string;
  children: ReactNode;
}) {
  const { pending } = useContext(PendingContext);
  const shown = pending != null && pending.scope === scope;
  return (
    <>
      {shown && (
        <div data-slot="pending-outline" className={className}>
          <OutlineOf outline={pending.outline} scope={scope} />
        </div>
      )}
      <div className={className} hidden={shown}>
        {children}
      </div>
    </>
  );
}
