import { createFileRoute } from "@tanstack/react-router";
import { readSlatePicks } from "../../lib/slate-picks";

/** Start answers a method without a handler with the site's page; this address is not a page. */
const notAllowed = () => new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });

/**
 * `GET /picks`: today's slate's picks, each in one line by game id, as JSON. A page's client
 * component asks here after first paint and again when the Scoreboard says a pick was written
 * (`lib/use-slate-picks.ts`): picks change by the hour. It answers `{}` when they cannot be read.
 *
 * A server route and not a server function: this is a read anyone may make, at an address.
 */
export const Route = createFileRoute("/picks")({
  server: {
    handlers: {
      GET: async () => {
        const { picks } = await readSlatePicks();
        return Response.json(picks, { headers: { "cache-control": "no-store" } });
      },
      POST: notAllowed,
      PUT: notAllowed,
      PATCH: notAllowed,
      DELETE: notAllowed,
    },
  },
});
