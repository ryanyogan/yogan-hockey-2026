import { AsyncLocalStorage } from "node:async_hooks";
import { EspnFetchError, EspnParseError } from "@yogan-hockey/espn";

/**
 * The status of a page whose read failed.
 *
 * TanStack Start answers 500 for a page whose loader threw, whatever threw, and draws the site's
 * error page inside the shell. So the Worker's entry runs each request inside
 * `answerWithRenderStatus`, a page's read reports its failure to `noteRenderFailure`
 * (`pageRead` in `src/functions/page-read.ts`), and the page that comes back is given the
 * failure's status:
 *
 * - 503 when the failed read was ESPN's (it did not answer, or answered what cannot be read):
 *   the page is unavailable for now and worth asking for again;
 * - 500 for anything else, which is a fault of this site's.
 *
 * Only a whole page is touched: a navigation inside the site asks for a server function's answer,
 * not a page, and the router draws the error page from it.
 *
 * (Under vinext, which answered 200 for a failed render, the same did for a 200. `doNotKeepPage`
 * and `watchRender`'s `unstorable` were its page cache's, and are kept only until the routes that
 * still call them are ported: #188 to #192.)
 */
type Render = { status: number | null; keep: boolean };

const renders = new AsyncLocalStorage<Render>();

const UPSTREAM_UNAVAILABLE = 503;
const OWN_FAULT = 500;

/** A render of the request in progress failed with `error`. The first failure decides. */
export function noteRenderFailure(error: unknown): void {
  const render = renders.getStore();
  if (render == null || render.status != null) return;
  const upstream = error instanceof EspnFetchError || error instanceof EspnParseError;
  render.status = upstream ? UPSTREAM_UNAVAILABLE : OWN_FAULT;
}

/**
 * The page being rendered must not be kept by the page cache (`lib/page-cache.ts`), though it
 * answers 200 and nothing failed. Call it wherever a render on a cacheable page draws something
 * in place of the page's own content:
 *
 * - a fallback for a read that failed and was caught (a header without its conference), which
 *   would otherwise be every visitor's page until the entry is rendered again;
 * - a not-found page (`pageNotFound` in `lib/page-not-found.ts`): beneath a `loading.tsx` the
 *   shell has been sent by the time `notFound()` is thrown, so it streams inside a 200.
 */
export function doNotKeepPage(): void {
  const render = renders.getStore();
  if (render != null) render.keep = false;
}

/**
 * The page of last resort: for a request that vinext could not answer at all, which is a failure
 * of the root layout. There is then no shell and no stylesheet to count on (`app/error.tsx` is
 * drawn inside the layout, and with it present vinext does not turn to `app/global-error.tsx`
 * on the server), so this is whole in itself, in the Agate look as far as a page with no fonts
 * to load can be: the wordmark and the title in a device's serif, the rules and the colours the
 * theme's own.
 */
const LAST_RESORT_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not answering · Yogan Hockey</title>
<style>
:root { color-scheme: light dark; --background: #fafaf8; --foreground: #111111; }
@media (prefers-color-scheme: dark) { :root { --background: #121212; --foreground: #eceae4; } }
body { margin: 0 auto; max-width: 1320px; padding: 0 16px 48px; background: var(--background);
  color: var(--foreground); font: 17px/1.4 Georgia, "Times New Roman", serif; }
a { color: inherit; font-weight: bold; }
.wordmark { display: block; margin: 18px 0 12px; text-align: center; white-space: nowrap;
  font-size: min(54px, 13.85vw); line-height: 0.95; letter-spacing: -0.025em;
  text-decoration: none; }
.rule { margin-bottom: 16px; border-top: 3px solid; padding-top: 2px; }
.rule::after { content: ""; display: block; border-top: 1px solid; }
h1 { margin: 0; font-size: 30px; line-height: 1.1; letter-spacing: -0.01em; }
h1 span { font: 13px/1.5 "Arial Narrow", "Helvetica Neue", Arial, sans-serif;
  letter-spacing: 0; opacity: 0.7; }
p { margin: 0; padding-top: 12px; }
</style>
</head>
<body>
<a class="wordmark" href="/">Yogan Hockey</a>
<div class="rule"></div>
<h1>Page <span>not read</span></h1>
<p>The site could not draw this page just now.
<a href="">Try again</a> or go to <a href="/">tonight</a>.</p>
</body>
</html>
`;

/**
 * Answers a request with `handle`'s response, under the status of a render that failed in it.
 * A `handle` that throws is answered with the page of last resort, never the platform's own.
 */
export async function answerWithRenderStatus(handle: () => Promise<Response>): Promise<Response> {
  return (await watchRender(handle)).response;
}

/**
 * `answerWithRenderStatus`, and with the answer a way to ask later whether the page cache must
 * decline to keep it (`lib/page-cache.ts`): a render failed, or called `doNotKeepPage`. Either
 * can come after the response has started, when its status has gone, so it is asked once the
 * body has been read.
 */
export async function watchRender(
  handle: () => Promise<Response>,
): Promise<{ response: Response; unstorable(): boolean }> {
  const render: Render = { status: null, keep: true };
  const unstorable = () => render.status != null || !render.keep;
  let response: Response;
  try {
    response = await renders.run(render, handle);
  } catch (error) {
    console.error("The site could not answer a request", error);
    render.status = OWN_FAULT;
    return {
      response: new Response(LAST_RESORT_PAGE, {
        status: OWN_FAULT,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      }),
      unstorable,
    };
  }
  const isPage = response.headers.get("content-type")?.startsWith("text/html") ?? false;
  // TanStack Start answers a page whose loader failed with a 500 of its own: the failure's status
  // replaces it, as it replaced vinext's 200.
  const answered = response.status === 200 || response.status === OWN_FAULT;
  if (render.status == null || !answered || !isPage) return { response, unstorable };
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  return { response: new Response(response.body, { status: render.status, headers }), unstorable };
}
