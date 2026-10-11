/** Consume the old selector once, so tab navigation starts with a clean canonical address. */
export function legacyPageLocation(url: URL): string | null {
  const rsc = url.pathname.endsWith(".rsc");
  const path = rsc ? url.pathname.slice(0, -4) : url.pathname;
  const selector = /^\/nhl\/games\/[^/]+$/.test(path)
    ? { key: "tab", values: ["scoring", "pick"] }
    : /^\/players\/[^/]+$/.test(path)
      ? { key: "games", values: ["all"] }
      : null;
  if (!selector) return null;
  const values = url.searchParams.getAll(selector.key);
  if (values.length !== 1 || !selector.values.includes(values[0] ?? "")) return null;
  const target = new URL(url);
  target.pathname = `${path}/${selector.key === "games" ? "games" : values[0]}${rsc ? ".rsc" : ""}`;
  target.searchParams.delete(selector.key);
  return target.href;
}
