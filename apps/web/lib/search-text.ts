/**
 * How the site reads and writes a query string: as text. Every search parameter of the site is a
 * word (`?tab=teams`, `?view=wildcard`, `?q=mar`), so a value is the text the address spells and
 * is written back as it was read: `?q=99` is "99" and stays `?q=99`.
 *
 * The router's own way is JSON, which reads `?q=99` as a number, `?q=1e3` as 1000 and `?q=true`
 * as a boolean, and writes a string of digits back in quotes (`?q=%2299%22`). These two take its
 * place for every route (`src/router.tsx`).
 */

/** A query string, read: each parameter's text, or the list of them when it is given twice. */
export type SearchText = Record<string, string | string[]>;

export function parseSearchText(search: string): SearchText {
  // No prototype: a parameter may be called anything, `__proto__` included.
  const query: SearchText = Object.create(null);
  for (const [name, value] of new URLSearchParams(search)) {
    const before = query[name];
    query[name] = before === undefined ? value : [...[before].flat(), value];
  }
  return query;
}

/** The query string of these parameters, "?" and all; "" for none. A list is written once each. */
export function stringifySearchText(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(search)) {
    for (const each of [value].flat()) {
      if (each != null) params.append(name, String(each));
    }
  }
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}
