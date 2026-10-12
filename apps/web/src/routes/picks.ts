import { createFileRoute } from "@tanstack/react-router";
import { readSlatePicks } from "../../lib/slate-picks";

/**
 * Start answers a method a route has no handler for with the site's page. This address is not a
 * page, so the others are answered here, as they were before the site was TanStack Start.
 */
const notAllowed = () => new Response(null, { status: 405 });
const allowed = () => new Response(null, { status: 204, headers: { allow: "GET, HEAD, OPTIONS" } });

/**
 * `GET /picks`: today's slate's picks, each in one line by game id, as JSON, never kept. It
 * answers `{}` when they cannot be read.
 *
 * Nothing on the site asks here: every page's loader reads its own picks (#188). The address is
 * kept as it was (#192).
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
      OPTIONS: allowed,
    },
  },
});
