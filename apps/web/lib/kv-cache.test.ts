import { afterEach, expect, test, vi } from "vitest";

const kept = vi.hoisted(() => [] as Promise<unknown>[]);

// The real `waitUntil` keeps the request alive and says nothing of what it was given.
vi.mock("cloudflare:workers", async (original) => ({
  ...(await original<object>()),
  waitUntil: (promise: Promise<unknown>) => {
    kept.push(promise);
  },
}));

import { cached } from "./kv-cache";

afterEach(() => {
  kept.length = 0;
});

test("a read is kept going until it has settled, whether or not its caller waits for it", async () => {
  let answer: (value: string) => void = () => {};
  const read = vi.fn(() => new Promise<string>((resolve) => (answer = resolve)));

  // The caller walks away: a page that has answered already, as after another read's failure.
  void cached("kv-cache-test:kept", 60, read);
  await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());

  const settled = vi.fn();
  void Promise.all(kept).then(settled);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(kept.length).toBeGreaterThan(0);
  expect(settled).not.toHaveBeenCalled();

  answer("read");
  await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
  // And nothing is left in cachified's memory for the next asker to wait on.
  expect(await cached("kv-cache-test:kept", 60, read)).toBe("read");
});

test("a read that fails is the caller's to hear, and what keeps it going does not reject", async () => {
  const failure = new Error("ESPN is down");

  await expect(cached("kv-cache-test:fails", 60, () => Promise.reject(failure))).rejects.toBe(
    failure,
  );
  await expect(Promise.all(kept)).resolves.toBeDefined();
});
