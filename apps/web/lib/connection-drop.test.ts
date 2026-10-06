import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchForDrop } from "./connection-drop";

describe("a socket that drops", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const watch = () => {
    const heard: boolean[] = [];
    return { heard, socket: watchForDrop(4000, (dropped) => heard.push(dropped)) };
  };

  it("says nothing for a drop shorter than the wait", () => {
    const { heard, socket } = watch();
    socket.opened();
    socket.closed();
    vi.advanceTimersByTime(3999);
    socket.opened();
    vi.advanceTimersByTime(10_000);
    expect(heard).toEqual([]);
  });

  it("reports a drop once it has lasted the wait, and its end when the socket opens", () => {
    const { heard, socket } = watch();
    socket.opened();
    socket.closed();
    vi.advanceTimersByTime(4000);
    expect(heard).toEqual([true]);
    socket.opened();
    expect(heard).toEqual([true, false]);
  });

  it("counts from the first close, not from each failed attempt to reconnect", () => {
    const { heard, socket } = watch();
    socket.opened();
    socket.closed();
    vi.advanceTimersByTime(3000);
    socket.closed();
    vi.advanceTimersByTime(1000);
    expect(heard).toEqual([true]);
    socket.closed();
    vi.advanceTimersByTime(60_000);
    expect(heard).toEqual([true]);
  });

  it("reports a socket that never opened at all", () => {
    const { heard, socket } = watch();
    socket.closed();
    vi.advanceTimersByTime(4000);
    expect(heard).toEqual([true]);
  });

  it("says nothing more once stopped", () => {
    const { heard, socket } = watch();
    socket.closed();
    socket.stop();
    vi.advanceTimersByTime(60_000);
    expect(heard).toEqual([]);
  });
});
