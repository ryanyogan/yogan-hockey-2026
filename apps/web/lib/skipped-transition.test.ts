import { describe, expect, it, vi } from "vitest";
import { quietSkippedTransitions } from "./skipped-transition";

/** A document whose view transitions are `ready` as given. */
const documentWith = (ready: () => Promise<void>) => {
  const started = vi.fn((_update: unknown) => ({
    ready: ready(),
    finished: Promise.resolve(),
    updateCallbackDone: Promise.resolve(),
  }));
  return { started, document: { startViewTransition: started } };
};

/** Rejections nobody handled while `run` and the turns after it ran. */
async function unhandledDuring(run: () => void): Promise<unknown[]> {
  const unhandled: unknown[] = [];
  const note = (event: PromiseRejectionEvent) => {
    unhandled.push(event.reason);
    event.preventDefault();
  };
  addEventListener("unhandledrejection", note);
  run();
  await new Promise((resolve) => setTimeout(resolve, 20));
  removeEventListener("unhandledrejection", note);
  return unhandled;
}

const skipped = () => new DOMException("Transition was skipped", "AbortError");

describe("a view transition that a later one skipped", () => {
  it("rejects nothing that nobody handles", async () => {
    const { document } = documentWith(() => Promise.reject(skipped()));
    quietSkippedTransitions(document);
    expect(await unhandledDuring(() => document.startViewTransition(() => {}))).toEqual([]);
  });

  it("is still the browser's own transition, started with what it was given", () => {
    const { document, started } = documentWith(() => Promise.resolve());
    quietSkippedTransitions(document);
    const update = () => {};
    const transition = document.startViewTransition(update);
    expect(started).toHaveBeenCalledWith(update);
    expect(transition).toBe(started.mock.results[0]?.value);
  });

  it("says any other failure of a transition on the console", async () => {
    const said = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("the update threw");
    const { document } = documentWith(() => Promise.reject(failure));
    quietSkippedTransitions(document);
    expect(await unhandledDuring(() => document.startViewTransition(() => {}))).toEqual([]);
    expect(said).toHaveBeenCalledWith(expect.any(String), failure);
    said.mockRestore();
  });

  it("does nothing where the browser has no view transitions, or was quieted already", () => {
    expect(() => quietSkippedTransitions({})).not.toThrow();
    const { document, started } = documentWith(() => Promise.resolve());
    quietSkippedTransitions(document);
    const once = document.startViewTransition;
    quietSkippedTransitions(document);
    expect(document.startViewTransition).toBe(once);
    document.startViewTransition(() => {});
    expect(started).toHaveBeenCalledTimes(1);
  });
});
