import { TEAM_TABS, teamPageHref } from "./team-page";

/** Consume the old selector once, so tab navigation starts with a clean canonical address. */
export function legacyPageLocation(url: URL): string | null {
  const rsc = url.pathname.endsWith(".rsc");
  const path = rsc ? url.pathname.slice(0, -4) : url.pathname;
  // A team's old tab link keeps its whole query, `tab` included, as the redirect it replaces did
  // (it was a line of vinext's configuration): the tab's own page ignores it.
  const team = /^\/nhl\/teams\/([^/]+)$/.exec(path);
  if (team?.[1] != null && !rsc) {
    const tabs = url.searchParams.getAll("tab");
    const tab = TEAM_TABS.find((candidate) => candidate === tabs[0]);
    if (tabs.length !== 1 || tab == null || teamPageHref(team[1], tab) === path) return null;
    const target = new URL(url);
    target.pathname = teamPageHref(team[1], tab);
    return target.href;
  }
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
