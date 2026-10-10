import { describe, expect, it, vi } from "vitest";

vi.mock("vinext/shims/request-context", () => ({ getRequestExecutionContext: () => null }));

import { memoFor, perRequest } from "./per-request";

describe("one read a request", () => {
  it("is shared by everything in the request that asks for the same key", async () => {
    const request = {};
    const read = vi.fn(async () => ({ name: "Maple Leafs" }));
    const [first, second] = await Promise.all([
      memoFor(request, "team:21", read),
      memoFor(request, "team:21", read),
    ]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("is made again for another key and for another request", async () => {
    const read = vi.fn(async () => 1);
    const request = {};
    await memoFor(request, "team:21", read);
    await memoFor(request, "team:22", read);
    await memoFor({}, "team:21", read);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("shares a failure too: the page fails as the layout did, on one read", async () => {
    const request = {};
    const read = vi.fn(async () => {
      throw new Error("ESPN is away");
    });
    await expect(memoFor(request, "team:21", read)).rejects.toThrow("ESPN is away");
    await expect(memoFor(request, "team:21", read)).rejects.toThrow("ESPN is away");
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("is simply made outside a request", async () => {
    const read = vi.fn(async () => 1);
    await perRequest("scoreboard", read);
    await perRequest("scoreboard", read);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
