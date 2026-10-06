// PROTOTYPE entry: /agents/* goes to the Agents SDK, everything else to vinext.
import { routeAgentRequest } from "agents";
import site from "vinext/server/fetch-handler";

export { GameAgent } from "./agent/game-agent";

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    if (new URL(request.url).pathname.startsWith("/agents/")) {
      const res = await routeAgentRequest(request, env as never);
      return res ?? new Response("No such agent", { status: 404 });
    }
    return (site as { fetch: Function }).fetch(request, env, ctx);
  },
};
