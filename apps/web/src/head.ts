import plex400 from "@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-400-normal.woff2?url";
import plex500 from "@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-500-normal.woff2?url";
import plex600 from "@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-600-normal.woff2?url";
import plex700 from "@fontsource/ibm-plex-sans-condensed/files/ibm-plex-sans-condensed-latin-700-normal.woff2?url";
import newsreader from "@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2?url";
import { APPLE_SPLASH_IMAGES } from "../lib/app-splash.generated";
import { APP_NAME, APP_SHORT_NAME, APPLE_ICON, FAVICON_PNG } from "../lib/install";
import stylesheet from "./globals.css?url";

/** A page's title as the tab shows it: "NHL standings · Yogan Hockey". Home's is the name alone. */
export function pageTitle(title?: string): string {
  return title == null ? APP_NAME : `${title} · ${APP_NAME}`;
}

/** What `titled` reads of a route's match: how its read came out. */
type Outcome = { status: string; _notFound?: boolean };

/**
 * A route's `head` for a page with this title, given the `match` its `head` was called with. The
 * title is the page's own only when its read answered: a read that failed is drawn by the error
 * page and one that found nothing by the not-found page (`components/shell/`), and the tab says
 * so. The router calls `head` for the match that failed and for none beneath it, so the last
 * title in the document is the right one.
 *
 * `_notFound` is the router's own mark on the root's match for an address no route answers, or a
 * `notFound()` no route beneath catches (router-core 1.171: `load-server.ts`, `load-client.ts`).
 * It has no public name, so a router upgrade is checked against `e2e/shell.spec.ts`.
 */
export function titled(match: Outcome, title?: string, notFoundTitle?: string) {
  return { meta: [{ title: pageTitle(outcomeTitle(match, notFoundTitle) ?? title) }] };
}

/**
 * The `head` of a route beneath the one that titles the page (a tab under its subject): nothing
 * while its read answers, so the parent's title stands, and the failure's title when it does not.
 */
export function failureTitled(match: Outcome) {
  const title = outcomeTitle(match);
  return { meta: title == null ? [] : [{ title: pageTitle(title) }] };
}

/**
 * `notFoundTitle` is a route's own words for a read of its own that found nothing, where its page
 * has them. An address no route answers is "Not found" wherever it is drawn.
 */
function outcomeTitle(match: Outcome, notFoundTitle = "Not found"): string | undefined {
  if (match.status === "error") return "Not answering";
  if (match.status === "notFound") return notFoundTitle;
  if (match._notFound) return "Not found";
  return undefined;
}

/**
 * The Latin files of Agate's two voices (`globals.css` has their faces), preloaded on every page:
 * Newsreader's one variable file and the four weights of IBM Plex Sans Condensed. The italic is
 * the pick line's alone and is fetched when a page first sets italic serif.
 */
const PRELOADED_FONTS = [newsreader, plex400, plex500, plex600, plex700];

/** What every page's `<head>` holds, whatever the page. */
export function siteHead({ match }: { match: Outcome }) {
  return {
    meta: [
      { charSet: "utf-8" },
      // `viewport-fit=cover` lets the page reach the screen's edges in an installed site, and
      // makes `env(safe-area-inset-*)` say how far the notch and the home bar reach in
      // (`globals.css`). The bars' colour is `ThemeColor`'s, since it follows the theme shown.
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      ...titled(match).meta,
      { name: "application-name", content: APP_NAME },
      // iOS takes its home screen name, bars and splash from these, not from the manifest.
      // "default" keeps the page below the status bar, which iOS draws itself;
      // "black-translucent" would lay the page under white status text, unreadable on paper.
      { name: "mobile-web-app-capable", content: "yes" },
      // The standard name is the line above; iOS before 17.4 reads only Apple's.
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: APP_SHORT_NAME },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      ...PRELOADED_FONTS.map((href) => ({
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href,
        crossOrigin: "anonymous" as const,
      })),
      { rel: "stylesheet", href: stylesheet },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: FAVICON_PNG, sizes: "64x64", type: "image/png" },
      { rel: "apple-touch-icon", href: APPLE_ICON, sizes: "180x180" },
      ...APPLE_SPLASH_IMAGES.map(({ url, media }) => ({
        rel: "apple-touch-startup-image",
        href: url,
        media,
      })),
    ],
  };
}
