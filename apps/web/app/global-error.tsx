"use client";

import { PageHeader } from "@yogan-hockey/ui/components/section";
import { useSyncExternalStore } from "react";
import { shownTheme } from "../lib/install";
import { subscribeToNothing } from "../lib/use-hydrated";
import "./globals.css";

/** The visitor's theme is dark. Storage a browser refuses to open counts as no choice made. */
function darkShown(): boolean {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem("theme");
  } catch {}
  return shownTheme(stored, window.matchMedia("(prefers-color-scheme: dark)").matches) === "dark";
}

/**
 * The shell itself failed in the browser, so there is nothing to draw inside: `app/error.tsx`
 * covers every failure below the root layout. The same words on a page of their own, with the
 * wordmark for a way home; the retry and the links load the site again from nothing. A root
 * layout that fails on the server never reaches this: `lib/render-failure.ts` answers that.
 */
export default function GlobalError() {
  // next-themes went with the layout, and React takes its class off <html> with the layout's
  // own: without this a visitor reading at night is shown the paper theme.
  const dark = useSyncExternalStore(subscribeToNothing, darkShown, () => false);
  return (
    // The layout's font variables went with the layout, and its fonts may not have loaded: the
    // theme's stacks fall back by themselves, the wordmark's to a device's serif.
    <html lang="en" className={dark ? "dark" : undefined}>
      <body>
        <title>Not answering · Yogan Hockey</title>
        <main data-slot="global-error" className="mx-auto max-w-[1320px] px-4 pb-12 md:px-6">
          {/* The masthead's wordmark and its double rule (`components/shell/masthead.tsx`). */}
          <p
            data-slot="wordmark"
            className="mt-[18px] whitespace-nowrap text-center font-bold font-serif text-[min(54px,13.85vw)] leading-[0.95] tracking-[-0.025em] [font-variation-settings:'opsz'_72] md:mt-7 md:text-[clamp(54px,9vw,120px)] md:leading-[0.92]"
          >
            <a href="/">Yogan Hockey</a>
          </p>
          <div aria-hidden="true" className="mt-3 mb-4 border-rule border-t-3 pt-0.5">
            <div className="border-rule border-t" />
          </div>
          <section>
            {/* The double rule is right above: a title's own heavy rule under it is a third. */}
            <PageHeader title="Page" count="not read" className="border-t-0 pt-0 md:pt-0" />
            <p className="pt-3 font-serif text-prose text-note leading-[1.4]">
              The site could not draw this page just now.{" "}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="tap-target cursor-pointer font-strong underline"
              >
                Try again
              </button>{" "}
              or go to{" "}
              <a href="/" className="tap-target font-strong underline">
                tonight
              </a>
              .
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
