/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const theme = read("./theme.css");
const faces = [...read("./font-fallbacks.css").matchAll(/@font-face \{([^}]+)\}/g)].map(
  ([, body = ""]) =>
    Object.fromEntries(
      [...body.matchAll(/^\s*([\w-]+):\s*(.+);$/gm)].map(([, property, value]) => [
        property,
        value,
      ]),
    ),
);

/** The families a font token names, in order, without their quotes. */
function stack(token: string): string[] {
  const value = new RegExp(`--${token}:([^;]+);`).exec(theme)?.[1] ?? "";
  // The real face is `var(--font-…, "Name")`: one entry, whatever commas it holds.
  return value
    .replace(/var\([^)]*\)/, "the real face")
    .split(",")
    .map((family) => family.trim().replaceAll('"', ""));
}

describe("the fallback faces", () => {
  it.each([
    ["font-serif", "Newsreader Fallback: "],
    ["font-agate", "IBM Plex Sans Condensed Fallback: "],
  ])("%s tries every sized fallback straight after its own face", (token, prefix) => {
    const defined = [
      ...new Set(
        faces
          .map((face) => face["font-family"]?.replaceAll('"', "") ?? "")
          .filter((family) => family.startsWith(prefix)),
      ),
    ];
    expect(defined.length).toBeGreaterThan(1);
    expect(stack(token).slice(0, defined.length + 1)).toEqual(["the real face", ...defined]);
  });

  it("each has a regular and a bold cut, sized over a face the device has", () => {
    const families = new Set(faces.map((face) => face["font-family"]));
    for (const family of families) {
      const cuts = faces.filter((face) => face["font-family"] === family);
      expect(cuts.map((cut) => cut["font-weight"])).toEqual(["100 599", "600 900"]);
      for (const cut of cuts) {
        expect(cut.src).toMatch(/^local\(/);
        expect(cut.src).not.toContain("url(");
        expect(Number.parseFloat(cut["size-adjust"] ?? "")).toBeGreaterThan(80);
        expect(cut["ascent-override"]).toMatch(/%$/);
        expect(cut["descent-override"]).toMatch(/%$/);
      }
    }
  });

  it("a bold is its face's bold, not its regular drawn heavier", () => {
    for (const face of faces.filter((cut) => cut["font-weight"] === "600 900")) {
      expect(face.src).toMatch(/^local\('[^']*Bold'\)/);
    }
  });
});
