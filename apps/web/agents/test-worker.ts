import { routeAgentRequest } from "agents";

/**
 * The Worker the Agent tests run against (vitest.config.ts): every Agent, and the routing of
 * `/agents/*` that `worker.ts` does, without the site. The test pool needs a default export to
 * evict a Durable Object, which is how a test restarts an Agent.
 */
export * from "./index";

export default {
  async fetch(request, env) {
    const response = await routeAgentRequest(request, env);
    return response ?? new Response("No such agent", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
