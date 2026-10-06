import { describe, expect, it } from "vitest";
import { refreshDue } from "./invalidation";

const at = (minute: number) => `2026-10-06T23:${String(minute).padStart(2, "0")}:00.000Z`;

describe("whether the Scoreboard's news means the page must be rendered again", () => {
  it("waits until it knows what the server rendered with", () => {
    expect(refreshDue({ rendered: undefined, heard: at(5), refreshedFor: undefined })).toBe(false);
  });

  it("waits until the socket has spoken", () => {
    expect(refreshDue({ rendered: at(5), heard: undefined, refreshedFor: undefined })).toBe(false);
  });

  it("does nothing when the socket says what the server rendered with", () => {
    expect(refreshDue({ rendered: at(5), heard: at(5), refreshedFor: undefined })).toBe(false);
    expect(refreshDue({ rendered: null, heard: null, refreshedFor: undefined })).toBe(false);
  });

  it("refreshes when the socket knows of an invalidation the render did not", () => {
    expect(refreshDue({ rendered: at(5), heard: at(9), refreshedFor: undefined })).toBe(true);
    expect(refreshDue({ rendered: null, heard: at(9), refreshedFor: undefined })).toBe(true);
  });

  it("refreshes once for each invalidation", () => {
    expect(refreshDue({ rendered: at(5), heard: at(9), refreshedFor: at(9) })).toBe(false);
    expect(refreshDue({ rendered: at(5), heard: at(12), refreshedFor: at(9) })).toBe(true);
  });

  it("does not refresh for a render newer than the socket's news", () => {
    expect(refreshDue({ rendered: at(9), heard: at(5), refreshedFor: undefined })).toBe(false);
  });
});
