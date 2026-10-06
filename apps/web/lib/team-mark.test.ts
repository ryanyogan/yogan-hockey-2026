import { describe, expect, it } from "vitest";
import { MARK_SIZES, teamMarkFile, teamMarkImages } from "./team-mark";
import { TEAM_MARKS } from "./team-marks.generated";

const marks = { 21: { v: "0a1b2c3d", dark: true }, 6: { v: "deadbeef", dark: false } };

describe("teamMarkImages", () => {
  it("gives a row's mark at twice its 14px, and three times for a phone that wants it", () => {
    expect(teamMarkImages("6", "row", marks)).toEqual({
      light: {
        src: "/team-marks/6-28.deadbeef.webp",
        srcSet: "/team-marks/6-28.deadbeef.webp 2x, /team-marks/6-42.deadbeef.webp 3x",
      },
      dark: null,
    });
  });

  it("gives a header's 20px mark a file for each density", () => {
    expect(teamMarkImages("6", "header", marks)?.light).toEqual({
      src: "/team-marks/6-28.deadbeef.webp",
      srcSet:
        "/team-marks/6-28.deadbeef.webp 1x, /team-marks/6-42.deadbeef.webp 2x, /team-marks/6-84.deadbeef.webp 3x",
    });
  });

  it("gives the dark logo only for a team whose dark logo differs", () => {
    expect(teamMarkImages("21", "row", marks)?.dark).toEqual({
      src: "/team-marks/21-dark-28.0a1b2c3d.webp",
      srcSet: "/team-marks/21-dark-28.0a1b2c3d.webp 2x, /team-marks/21-dark-42.0a1b2c3d.webp 3x",
    });
    expect(teamMarkImages("6", "header", marks)?.dark).toBeNull();
  });

  it("gives nothing for a team with no mark: an all-star side, a new club", () => {
    expect(teamMarkImages("99999", "row", marks)).toBeNull();
    // An id is looked up as a key and nothing more: a name every object has is not a team.
    expect(teamMarkImages("constructor", "row", marks)).toBeNull();
  });
});

describe("the committed marks", () => {
  it("has a mark for all 32 clubs, every file named as the page will ask for it", () => {
    // The tests run inside workerd, which has no disk: Vite lists the files as it builds the test.
    const found = Object.keys(import.meta.glob("../public/team-marks/*.webp", { query: "?url" }));
    const files = new Set(found.map((path) => path.slice(path.lastIndexOf("/") + 1)));
    const asked = Object.entries(TEAM_MARKS).flatMap(([id, entry]) =>
      MARK_SIZES.flatMap((size) => [
        teamMarkFile(id, entry, false, size),
        ...(entry.dark ? [teamMarkFile(id, entry, true, size)] : []),
      ]),
    );
    expect(Object.keys(TEAM_MARKS)).toHaveLength(32);
    expect(asked.filter((file) => !files.has(file))).toEqual([]);
    expect(files.size).toBe(asked.length);
  });
});
