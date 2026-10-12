import site from "@tanstack/react-start/server-entry";
import { routeAgentRequest } from "agents";

import { spaceEndedAddress, trailingSlashLocation } from "./lib/canonical-address";
import { legacyPageLocation } from "./lib/legacy-page-redirect";
import { answerWithRenderStatus } from "./lib/render-failure";

export * from "./agents";

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/agents/")) {
      const response = await routeAgentRequest(request, env);
      return response ?? new Response("No such agent", { status: 404 });
    }
    const url = new URL(request.url);
    // An address ending in a slash is the one without it, for good and whatever the method.
    const slashless = trailingSlashLocation(url);
    if (slashless) return Response.redirect(slashless, 308);
    // A legacy tab query is consumed before rendering, preserving unrelated queries.
    if (request.method === "GET" || request.method === "HEAD") {
      const location = legacyPageLocation(url);
      if (location) return Response.redirect(location, 308);
    }
    // Everything else is the site's: a page, a loader's server function, a server route. A page
    // whose read failed is drawn by the site's error page and answered with the failure's status.
    // An address ending in a space is asked for in the spelling that keeps the space.
    const kept = spaceEndedAddress(url);
    const asked = kept ? new Request(kept, request) : request;
    return answerWithRenderStatus(async () => site.fetch(asked));
  },
} satisfies ExportedHandler<Env>;
