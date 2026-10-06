import { routeAgentRequest } from "agents";
import site from "vinext/server/fetch-handler";

import { answerWithRenderStatus } from "./lib/render-failure";

export * from "./agents";

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith("/agents/")) {
      const response = await routeAgentRequest(request, env);
      return response ?? new Response("No such agent", { status: 404 });
    }
    // A page whose render failed is drawn by `app/error.tsx` and answered with an error status.
    return answerWithRenderStatus(() => site.fetch(request, env, ctx));
  },
} satisfies ExportedHandler<Env>;
