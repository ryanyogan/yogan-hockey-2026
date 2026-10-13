import { describe, expect, it } from "vitest";
import {
  type Address,
  type Answer,
  addresses,
  compare,
  fails,
  ownPath,
  parityReport,
  titleOf,
  verdict,
} from "./addresses.ts";

const answer = (changes: Partial<Answer> = {}): Answer => ({
  status: 200,
  location: null,
  title: "Standings · Yogan Hockey",
  type: "text/html",
  allow: null,
  ...changes,
});
const at = (path: string, intended?: string): Address => ({ path, group: "pages", intended });

describe("the addresses", () => {
  const all = addresses();
  const paths = all.map((address) => `${address.method ?? "GET"} ${address.path}`);

  it("asks for no address twice", () => {
    expect(paths.filter((path, index) => paths.indexOf(path) !== index)).toEqual([]);
  });

  it("has every page of main's app directory, with a recorded id in place of each [id]", () => {
    for (const path of [
      "/",
      "/nhl",
      "/nhl/live",
      "/nhl/teams/21",
      "/nhl/teams/21/roster",
      "/nhl/teams/21/stats",
      "/nhl/games/401803652",
      "/nhl/games/401803652/scoring",
      "/nhl/games/401803652/pick",
      "/nhl/games/401892449",
      "/players",
      "/players/4024123",
      "/players/4024123/games",
      "/players/3067313",
      "/skeleton",
      "/skeleton/dashboard",
      "/skeleton/live",
      "/skeleton/loading",
      "/skeleton/picks",
      "/picks",
      "/manifest.webmanifest",
    ]) {
      expect(paths).toContain(`GET ${path}`);
    }
  });

  it("asks /picks by every method", () => {
    for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      expect(paths).toContain(`${method} /picks`);
    }
  });

  it("means only the placeholder page, the Picks page and vinext's own transport to differ", () => {
    expect([
      ...new Set(all.filter((address) => address.intended != null).map((address) => address.path)),
    ]).toEqual(["/skeleton/loading", "/picks", "/nhl.rsc", "/nhl/teams/21.rsc?tab=roster"]);
  });
});

describe("ownPath", () => {
  it("takes the origin of the site asked off a location, so two ports compare", () => {
    expect(ownPath("http://localhost:5350/nhl/teams/21/roster", "http://localhost:5350")).toBe(
      "/nhl/teams/21/roster",
    );
    expect(ownPath("http://localhost:5350", "http://localhost:5350")).toBe("/");
  });

  it("leaves a relative location and another site's as they are", () => {
    expect(ownPath("/nhl/teams/21/roster", "http://localhost:5350")).toBe("/nhl/teams/21/roster");
    expect(ownPath("https://example.com/a", "http://localhost:5350")).toBe("https://example.com/a");
    expect(ownPath(null, "http://localhost:5350")).toBeNull();
  });
});

describe("titleOf", () => {
  it("reads the first title of a document", () => {
    expect(titleOf("<head><title>Not found · Yogan Hockey</title></head><title>x</title>")).toBe(
      "Not found · Yogan Hockey",
    );
    expect(titleOf("<p>no title</p>")).toBeNull();
  });
});

describe("compare", () => {
  it("fails on a different status", () => {
    const compared = compare(at("/nhl"), answer(), answer({ status: 404 }));
    expect(verdict(compared)).toBe("differs");
    expect(fails([compared])).toBe(true);
  });

  it("fails on a different location under the same status", () => {
    const compared = compare(
      at("/nhl/teams/21?tab=roster"),
      answer({ status: 308, location: "/nhl/teams/21/roster" }),
      answer({ status: 308, location: "/nhl/teams/21" }),
    );
    expect(verdict(compared)).toBe("differs");
  });

  it("reports a different title and does not fail on it", () => {
    const compared = compare(
      at("/nhl/teams/leafs/coaches"),
      answer({ status: 404, title: "Not found" }),
      answer({ status: 404, title: "Team not found" }),
    );
    expect(verdict(compared)).toBe("same");
    expect(compared.notes).toEqual(["title: Not found on main, Team not found on the branch"]);
    expect(fails([compared])).toBe(false);
  });

  it("does not fail on a difference the address says is meant, and says when one did not happen", () => {
    const meant = at("/skeleton/loading", "gone on purpose");
    expect(verdict(compare(meant, answer(), answer({ status: 404 })))).toBe("intended");
    expect(fails([compare(meant, answer(), answer({ status: 404 }))])).toBe(false);
    expect(verdict(compare(meant, answer(), answer()))).toBe("intended, but the same");
  });
});

describe("parityReport", () => {
  it("counts, and puts the differences and their reasons before the whole list", () => {
    const text = parityReport(
      [
        compare(at("/nhl"), answer(), answer()),
        compare(at("/skeleton/loading", "gone on purpose"), answer(), answer({ status: 404 })),
        compare(at("/a|b"), answer({ status: 308, location: "/x" }), answer()),
      ],
      { main: "http://localhost:1", branch: "http://localhost:2" },
    );
    expect(text).toContain("3 addresses asked");
    expect(text).toContain(
      "1 answer with the same status and `location`, 1 differ, 1 differ as intended.",
    );
    expect(text).toContain("- `/skeleton/loading`: gone on purpose");
    expect(text).toContain("| pages | `GET /a\\|b` | 308 → `/x` | 200 |");
    expect(text.indexOf("## Differences in status")).toBeLessThan(text.indexOf("## Every address"));
  });
});
