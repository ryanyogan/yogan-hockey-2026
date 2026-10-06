import { routeAgentRequest } from "agents";
import site from "vinext/server/fetch-handler";

export { SkeletonAgent } from "./agents/skeleton-agent";

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith("/agents/")) {
      const response = await routeAgentRequest(request, env);
      return response ?? new Response("No such agent", { status: 404 });
    }
    return site.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
