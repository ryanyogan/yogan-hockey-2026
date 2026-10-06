import { AsyncLocalStorage } from "node:async_hooks";
import { EspnFetchError, EspnParseError } from "@yogan-hockey/espn";

/**
 * The status of a page whose render failed.
 *
 * vinext answers 200 for a failed render that an `error.tsx` catches: the status is decided
 * before the boundary is drawn and nothing in a page can change it. So the Worker's entry runs
 * each request inside `answerWithRenderStatus`, `instrumentation.ts` reports each failed render
 * to `noteRenderFailure`, and the page that comes back is given the failure's status:
 *
 * - 503 when the failed read was ESPN's (it did not answer, or answered what cannot be read):
 *   the page is unavailable for now and worth asking for again;
 * - 500 for anything else, which is a fault of this site's.
 *
 * Only a whole page is touched. A navigation inside the site (an RSC answer) keeps its 200, since
 * vinext's client draws the boundary from it; so does a failure that streams in after the
 * response has started, whose status has already gone.
 */
type Render = { status: number | null };

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
 * The page of last resort: for a request that vinext could not answer at all, which is a failure
 * of the root layout. There is then no shell and no stylesheet to count on (`app/error.tsx` is
 * drawn inside the layout, and with it present vinext does not turn to `app/global-error.tsx`
 * on the server), so this is whole in itself, in the site's type and colours.
 */
const LAST_RESORT_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not answering · Yogan Hockey</title>
<style>
:root { color-scheme: light dark; --background: #fbfaf7; --foreground: #171717; }
@media (prefers-color-scheme: dark) { :root { --background: #0f172a; --foreground: #f1f5f9; } }
body { margin: 0; padding: 16px; background: var(--background); color: var(--foreground);
  font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
a { color: inherit; font-weight: bold; }
.wordmark { display: block; margin-bottom: 32px; font-size: 14px; text-decoration: none; }
h1 { margin: 0 0 4px; font-size: inherit; text-transform: uppercase; }
h1 span { font-weight: normal; text-transform: none; opacity: 0.5; }
p { margin: 0; padding: 6px 8px;
  border-top: 1px solid color-mix(in srgb, currentColor 20%, transparent); }
</style>
</head>
<body>
<a class="wordmark" href="/">YOGAN/HOCKEY</a>
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
 * `answerWithRenderStatus`, and with the answer a way to ask later whether a render failed:
 * a failure can come after the response has started, when its status has gone but the page
 * cache can still decline to keep the page (`lib/page-cache.ts`).
 */
export async function watchRender(
  handle: () => Promise<Response>,
): Promise<{ response: Response; failed(): boolean }> {
  const render: Render = { status: null };
  const failed = () => render.status != null;
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
      failed,
    };
  }
  const isPage = response.headers.get("content-type")?.startsWith("text/html") ?? false;
  if (render.status == null || response.status !== 200 || !isPage) return { response, failed };
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  return { response: new Response(response.body, { status: render.status, headers }), failed };
}
