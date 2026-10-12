import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * What a test reads of a rendered primitive: its markup, its text, and the classes and attributes
 * of an element found by its tag or its `data-slot`. The primitives are markup and classes and no
 * more, so they are rendered to a string and read with expressions: no DOM.
 */
export function render(element: ReactElement) {
  const html = renderToStaticMarkup(element);
  const tags = [...html.matchAll(/<([a-z0-9]+)((?:\s[^<>]*?)?)\/?>/g)].map((match) => ({
    tag: match[1] ?? "",
    attributes: Object.fromEntries(
      [...(match[2] ?? "").matchAll(/([a-z-]+)(?:="([^"]*)")?/g)].map((pair) => [
        pair[1] ?? "",
        pair[2] ?? "",
      ]),
    ) as Record<string, string | undefined>,
  }));
  const nth = (matching: typeof tags, index: number) => {
    const found = matching[index];
    if (!found) throw new Error(`Nothing matched in: ${html}`);
    return { ...found, classes: (found.attributes.class ?? "").split(/\s+/).filter(Boolean) };
  };
  const slots = (name: string) => tags.filter((tag) => tag.attributes["data-slot"] === name);
  return {
    html,
    /** The text, tags removed. */
    text: html.replace(/<[^>]+>/g, ""),
    tag: (name: string, index = 0) =>
      nth(
        tags.filter((tag) => tag.tag === name),
        index,
      ),
    slot: (name: string, index = 0) => nth(slots(name), index),
    count: (name: string) => slots(name).length,
  };
}
