import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { seedSamplePicks } from "../../lib/sample-picks";
import { readSlatePicks } from "../../lib/slate-picks";
import { Route } from "./picks";

/** Asks the route as Start does: its handler for the method. */
function ask(method: string): Response | Promise<Response> {
  const handlers = Route.options.server?.handlers as Record<string, () => Response>;
  const handler = handlers[method];
  if (!handler) throw new Error(`/picks has no handler for ${method}`);
  return handler();
}

/**
 * The route as it was under vinext (`app/picks/route.ts` on `main` before the port), word for
 * word. vinext was not run for this test: what it answered to the other methods is read from its
 * route handler dispatch, and written out in the cases below.
 */
async function mainsAnswer(): Promise<Response> {
  const { picks } = await readSlatePicks();
  return Response.json(picks, { headers: { "cache-control": "no-store" } });
}

const answered = async (response: Response) => ({
  status: response.status,
  contentType: response.headers.get("content-type"),
  cacheControl: response.headers.get("cache-control"),
  body: await response.text(),
});

beforeAll(async () => {
  vi.stubEnv("ESPN_FIXTURES", "1");
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  // The first call starts the Scoreboard Agent cold, which takes seconds on a busy machine.
}, 30_000);

describe("GET /picks", () => {
  it("answers as main does when no pick is written: an empty object, never kept", async () => {
    const answer = await answered(await ask("GET"));

    expect(answer).toEqual(await answered(await mainsAnswer()));
    expect(answer).toEqual({
      status: 200,
      contentType: "application/json",
      cacheControl: "no-store",
      body: "{}",
    });
  }, 30_000);

  it("answers as main does with the slate's picks: a line a game, by game id", async () => {
    await seedSamplePicks("right");

    const answer = await answered(await ask("GET"));

    expect(answer).toEqual(await answered(await mainsAnswer()));
    expect(answer.status).toBe(200);
    // Nashville at Toronto, picked at 58%; the game whose Prediction failed says nothing.
    const picks = JSON.parse(answer.body);
    expect(picks["401892449"]).toBe("TOR 58%");
    expect(picks).not.toHaveProperty("401892450");
    expect(Object.keys(picks)).toHaveLength(8);
  }, 30_000);
});

describe("the other methods, as vinext answered a route with a GET alone", () => {
  it("answers a bare 405 to a method that is not a read, not the site's page", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await ask(method);
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBeNull();
      expect(await response.text()).toBe("");
    }
  });

  it("answers OPTIONS with the methods it takes", async () => {
    const response = await ask("OPTIONS");
    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
  });
});
