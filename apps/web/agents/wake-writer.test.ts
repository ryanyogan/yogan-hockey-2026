import { expect, test, vi } from "vitest";
import { wakeWriterOnce } from "./wake-writer";
import { WriterAgent } from "./writer-agent";

/** Each request's `ctx`: what it was asked to wait for, so the test can wait too. */
function context() {
  const waited: Promise<unknown>[] = [];
  return { waited, waitUntil: vi.fn((work: Promise<unknown>) => void waited.push(work)) };
}

test("a wake that fails is logged, reaches nobody, and is tried again by the next request", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const wake = vi.spyOn(WriterAgent.prototype, "wake").mockRejectedValueOnce(new Error("down"));
  const first = context();
  const second = context();

  wakeWriterOnce(first);
  await Promise.all(first.waited);
  wakeWriterOnce(second);
  await Promise.all(second.waited);

  expect(errors.mock.calls[0]?.[0]).toBe("Writer: could not be woken");
  expect(wake).toHaveBeenCalledTimes(2);
  vi.restoreAllMocks();
});

test("once the Writer has been woken, later requests of the isolate do nothing", async () => {
  const wake = vi.spyOn(WriterAgent.prototype, "wake");
  const later = context();

  wakeWriterOnce(later);
  wakeWriterOnce(later);

  expect(later.waitUntil).not.toHaveBeenCalled();
  expect(wake).not.toHaveBeenCalled();
});
