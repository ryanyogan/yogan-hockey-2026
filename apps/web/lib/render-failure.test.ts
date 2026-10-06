import { EspnFetchError, EspnParseError } from "@yogan-hockey/espn";
import { describe, expect, it } from "vitest";
import { answerWithRenderStatus, noteRenderFailure } from "./render-failure";

const html = (status = 200) =>
  new Response("<p>the error page</p>", {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "x-kept": "yes" },
  });

/** A render that fails with `error` and still answers, as vinext does with an `error.tsx`. */
const failing = (error: unknown, response: Response = html()) =>
  answerWithRenderStatus(async () => {
    await Promise.resolve();
    noteRenderFailure(error);
    return response;
  });

describe("the status of a page whose render failed", () => {
  it("leaves a page that rendered as it is", async () => {
    const response = html();
    expect(await answerWithRenderStatus(async () => response)).toBe(response);
  });

  it("is 503 when ESPN did not answer", async () => {
    const response = await failing(new EspnFetchError("teams/1", null, "no response"));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("<p>the error page</p>");
    expect(response.headers.get("x-kept")).toBe("yes");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("is 503 when ESPN answered something this site cannot read", async () => {
    const response = await failing(new EspnParseError("teams/1", new SyntaxError("bad")));
    expect(response.status).toBe(503);
  });

  it("is 500 for any other failure", async () => {
    expect((await failing(new Error("a fault of our own"))).status).toBe(500);
    expect((await failing("thrown text")).status).toBe(500);
  });

  it("keeps the first failure's status when a render reports several", async () => {
    const response = await answerWithRenderStatus(async () => {
      noteRenderFailure(new EspnFetchError("teams/1", 500, "HTTP 500"));
      noteRenderFailure(new Error("what came of it"));
      return html();
    });
    expect(response.status).toBe(503);
  });

  it("leaves alone an answer that is not a page, or already has a status of its own", async () => {
    const flight = new Response("0:{}", { headers: { "content-type": "text/x-component" } });
    expect(await failing(new Error("x"), flight)).toBe(flight);
    const missing = html(404);
    expect(await failing(new Error("x"), missing)).toBe(missing);
  });

  it("keeps two requests' failures apart", async () => {
    const [failed, fine] = await Promise.all([
      failing(new Error("x")),
      answerWithRenderStatus(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return html();
      }),
    ]);
    expect(failed.status).toBe(500);
    expect(fine.status).toBe(200);
  });

  it("answers a request that could not be answered at all with a page of its own", async () => {
    const response = await answerWithRenderStatus(async () => {
      throw new Error("https://site.api.espn.com/secret did not answer");
    });
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const page = await response.text();
    expect(page).toContain("YOGAN/HOCKEY");
    expect(page).toContain("Try again");
    expect(page).not.toContain("espn.com");
  });

  it("ignores a failure reported outside any request", () => {
    expect(() => noteRenderFailure(new Error("x"))).not.toThrow();
  });
});
