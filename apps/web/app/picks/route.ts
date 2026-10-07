import { readSlatePicks } from "../../lib/slate-picks";

/**
 * `GET /picks`: today's slate's picks, each in one line by game id, as JSON. For a page that is
 * served from the page cache (spec section 2): picks change by the hour and are behind no cache
 * tag, so such a page is rendered without them and its client component asks here after first
 * paint (`lib/use-slate-picks.ts`). It answers `{}` when they cannot be read.
 *
 * A route and not a Server Action: an action is a POST to the page's own address, which reads as
 * a second request for the page, and this is a read anyone may make.
 */
export async function GET(): Promise<Response> {
  const { picks } = await readSlatePicks();
  return Response.json(picks, { headers: { "cache-control": "no-store" } });
}
