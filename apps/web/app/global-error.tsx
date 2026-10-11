"use client";

/**
 * The page's whole look, as `lib/render-failure.ts` writes its page of last resort: the site's
 * type and colours, the theme the operating system asks for. It is written here and not taken
 * from `globals.css`: a stylesheet imported by this file is built a second time under another
 * name, and every document of the site then links both copies.
 */
const STYLES = `
:root { color-scheme: light dark; --background: #fbfaf7; --foreground: #171717; }
@media (prefers-color-scheme: dark) { :root { --background: #0f172a; --foreground: #f1f5f9; } }
body { margin: 0; padding: 16px; background: var(--background); color: var(--foreground);
  font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
a, button { color: inherit; font: inherit; font-weight: bold; }
button { padding: 0; border: 0; background: none; text-decoration: underline; cursor: pointer; }
.wordmark { display: block; margin-bottom: 32px; font-size: 14px; text-decoration: none; }
h1 { margin: 0 0 4px; font-size: inherit; text-transform: uppercase; }
h1 span { font-weight: normal; text-transform: none; opacity: 0.5; }
p { margin: 0; padding: 6px 8px;
  border-top: 1px solid color-mix(in srgb, currentColor 20%, transparent); }
`;

/**
 * The shell itself failed in the browser, so there is nothing to draw inside: `app/error.tsx`
 * covers every failure below the root layout. The same words on a page of their own, with the
 * wordmark for a way home; the retry and the links load the site again from nothing. A root
 * layout that fails on the server never reaches this: `lib/render-failure.ts` answers that.
 */
export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <title>Not answering · Yogan Hockey</title>
        <style>{STYLES}</style>
        <main data-slot="global-error">
          <a href="/" className="wordmark">
            YOGAN/HOCKEY
          </a>
          <h1>
            Page <span>not read</span>
          </h1>
          <p>
            The site could not draw this page just now.{" "}
            <button type="button" onClick={() => window.location.reload()}>
              Try again
            </button>{" "}
            or go to <a href="/">tonight</a>.
          </p>
        </main>
      </body>
    </html>
  );
}
