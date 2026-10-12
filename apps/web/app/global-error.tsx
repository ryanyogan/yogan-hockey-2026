"use client";

import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import "./globals.css";

/**
 * The shell itself failed in the browser, so there is nothing to draw inside: `app/error.tsx`
 * covers every failure below the root layout. The same words on a page of their own, with the
 * wordmark for a way home; the retry and the links load the site again from nothing. A root
 * layout that fails on the server never reaches this: `lib/render-failure.ts` answers that.
 */
export default function GlobalError() {
  return (
    // The layout's font variables went with the layout: the theme's stacks fall back by themselves.
    <html lang="en">
      <body>
        <title>Not answering · Yogan Hockey</title>
        <main data-slot="global-error" className="space-y-4 p-4 md:p-6">
          <a href="/" className="block font-strong text-wordmark">
            YOGAN/HOCKEY
          </a>
          <Section>
            <SectionHeader title="Page" count="not read" />
            <p className="border-rule-head border-t px-2 py-row">
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
          </Section>
        </main>
      </body>
    </html>
  );
}
