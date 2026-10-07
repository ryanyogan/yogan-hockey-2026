import { expect, it, vi } from "vitest";
import { pageNotFound } from "./page-not-found";
import { watchRender } from "./render-failure";

// vinext's own, which only its build resolves: it throws for the framework to catch.
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

it("a not-found page streamed inside a 200 is not for the page cache to keep", async () => {
  let thrown: unknown;
  const { response, unstorable } = await watchRender(async () => {
    try {
      pageNotFound();
    } catch (error) {
      // What vinext catches to draw `not-found.tsx`, after the shell has gone.
      thrown = error;
    }
    return new Response("0:{}", { headers: { "content-type": "text/x-component" } });
  });
  expect(response.status).toBe(200);
  expect(thrown).toEqual(new Error("NEXT_NOT_FOUND"));
  expect(unstorable()).toBe(true);
});
