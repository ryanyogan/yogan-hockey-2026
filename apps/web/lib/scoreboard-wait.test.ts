import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCOREBOARD_WAIT_MS, waitForScoreboard } from "./scoreboard-wait";

describe("waiting for the Scoreboard's socket on a cached page", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const waiting = () => {
    const gaveUp = vi.fn();
    return { gaveUp, wait: waitForScoreboard(gaveUp) };
  };

  it("waits four seconds, then gives up once", () => {
    const { gaveUp } = waiting();
    vi.advanceTimersByTime(3999);
    expect(gaveUp).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(gaveUp).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(gaveUp).toHaveBeenCalledTimes(1);
    expect(SCOREBOARD_WAIT_MS).toBe(4000);
  });

  it("does not give up once the socket has spoken", () => {
    const { gaveUp, wait } = waiting();
    vi.advanceTimersByTime(3999);
    wait.heard();
    vi.advanceTimersByTime(60_000);
    expect(gaveUp).not.toHaveBeenCalled();
  });

  it("says nothing after the page has gone", () => {
    const { gaveUp, wait } = waiting();
    wait.stop();
    vi.advanceTimersByTime(60_000);
    expect(gaveUp).not.toHaveBeenCalled();
  });
});
