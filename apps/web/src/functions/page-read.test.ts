import { notFound } from "@tanstack/react-router";
import { EspnFetchError } from "@yogan-hockey/espn";
import { afterEach, describe, expect, it, vi } from "vitest";
import { answerWithRenderStatus } from "../../lib/render-failure";
import { pageRead } from "./page-read";

/** Start's own answer for a page whose loader threw: the error page, under a 500. */
const startsAnswer = () =>
  new Response("<p>the error page</p>", {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

/** A request whose page reads with `read`, answered as the Worker's entry answers it. */
const request = (read: () => Promise<unknown>) =>
  answerWithRenderStatus(async () => {
    const thrown = await pageRead(read).catch((error: unknown) => error);
    return thrown instanceof Error ? startsAnswer() : new Response("<p>the page</p>");
  });

afterEach(() => vi.restoreAllMocks());

describe("a page's read", () => {
  it("answers what was read", async () => {
    expect(await pageRead(async () => "the standings")).toBe("the standings");
  });

  it("makes the page a 503 when ESPN did not answer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await request(async () => {
      throw new EspnFetchError("standings", null, "no response");
    });
    expect(response.status).toBe(503);
  });

  it("makes the page a 500 for a fault of the site's own", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await request(async () => {
      throw new TypeError("a fault of our own");
    });
    expect(response.status).toBe(500);
  });

  it("tells the browser nothing of the failure, and the Worker's log all of it", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new EspnFetchError("https://site.api.espn.com/standings", 500, "HTTP 500");
    const thrown = await pageRead(async () => {
      throw failure;
    }).catch((error: unknown) => error);
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("The page could not be read");
    expect(logged).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it("leaves a page that does not exist to the router, with no failure noted", async () => {
    const missing = notFound();
    const response = await answerWithRenderStatus(async () => {
      const thrown = await pageRead(async () => {
        throw missing;
      }).catch((error: unknown) => error);
      expect(thrown).toBe(missing);
      return new Response("<p>not found</p>", {
        status: 404,
        headers: { "content-type": "text/html" },
      });
    });
    expect(response.status).toBe(404);
  });
});
