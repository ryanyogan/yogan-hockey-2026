import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { FONT_FALLBACKS_CSS, fontFallbacks } from "./font-fallbacks.ts";

it("the fallback faces in the theme are the ones the script writes", async () => {
  // A number changed in `font-fallbacks.ts` and not written out would be a fix that never shipped.
  expect(await readFile(FONT_FALLBACKS_CSS, "utf8")).toBe(fontFallbacks().css);
});
